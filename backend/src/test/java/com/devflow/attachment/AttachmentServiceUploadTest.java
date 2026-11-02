package com.devflow.attachment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.project.service.ProjectAccessChecker;
import com.devflow.member.entity.ProjectMember;
import com.devflow.task.entity.Task;
import com.devflow.task.repository.TaskRepository;
import com.devflow.user.entity.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

class AttachmentServiceUploadTest {

    private final TaskAttachmentRepository repository = mock(TaskAttachmentRepository.class);
    private final TaskRepository taskRepository = mock(TaskRepository.class);
    private final ProjectAccessChecker access = mock(ProjectAccessChecker.class);
    private final AttachmentStorage storage = mock(AttachmentStorage.class);
    private final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-27T00:00:00Z"), ZoneOffset.UTC);
    private final AttachmentService service = new AttachmentService(
            repository, taskRepository, access, storage,
            new AttachmentProperties("memory", 20, Duration.ofMinutes(5), null, null),
            mock(DownloadTokens.class), clock, new TransactionTemplate(transactionManager));

    private final Task task = mock(Task.class);
    private final com.devflow.project.entity.Project project = mock(com.devflow.project.entity.Project.class);
    private final User uploader = mock(User.class);
    private final ProjectMember member = mock(ProjectMember.class);

    AttachmentServiceUploadTest() {
        given(access.getMembership(1L, 9L)).willReturn(member);
        given(member.getUser()).willReturn(uploader);
        given(taskRepository.findById(7L)).willReturn(java.util.Optional.of(task));
        given(task.getId()).willReturn(7L);
        given(task.getProject()).willReturn(project);
        given(project.getId()).willReturn(1L);
        given(repository.countByTaskId(7L)).willReturn(0L);
        given(transactionManager.getTransaction(any())).willReturn(new SimpleTransactionStatus());
    }

    private MockMultipartFile file() {
        return new MockMultipartFile("file", "메모.txt", "text/plain", "본문".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void 업로드에_성공하면_저장소에_키_규칙으로_쓰고_메타데이터를_저장한다() {
        given(repository.saveAndFlush(any())).willAnswer(call -> call.getArgument(0));

        AttachmentDtos.AttachmentResponse response = service.upload(9L, 1L, 7L, file());

        assertThat(response.fileName()).isEqualTo("메모.txt");
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storage).put(key.capture(), any(InputStream.class), eq(6L), eq("text/plain"));
        assertThat(key.getValue()).matches("projects/1/tasks/7/[0-9a-f-]{36}");
        verify(transactionManager).commit(any());
    }

    @Test
    void 빈_파일은_저장소에_쓰지_않고_400이다() {
        MockMultipartFile empty = new MockMultipartFile("file", "빈.txt", "text/plain", new byte[0]);

        assertThatThrownBy(() -> service.upload(9L, 1L, 7L, empty))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REQUEST);
        verify(storage, never()).put(anyString(), any(), anyLong(), anyString());
    }

    @Test
    void DB_저장_실패_시_저장소에서_보상_삭제한다() {
        given(repository.saveAndFlush(any())).willThrow(new RuntimeException("insert failed"));

        assertThatThrownBy(() -> service.upload(9L, 1L, 7L, file())).isInstanceOf(RuntimeException.class);

        verify(storage).put(anyString(), any(InputStream.class), anyLong(), anyString());
        verify(storage).delete(anyString());
    }

    @Test
    void DB_커밋_실패_시_저장소에서_보상_삭제한다() {
        given(repository.saveAndFlush(any())).willAnswer(call -> call.getArgument(0));
        willThrow(mock(TransactionException.class)).given(transactionManager).commit(any());

        assertThatThrownBy(() -> service.upload(9L, 1L, 7L, file()))
                .isInstanceOf(TransactionException.class);

        verify(storage).delete(anyString());
    }

    @Test
    void 보상_삭제가_실패해도_원래_DB_예외를_던진다() {
        given(repository.saveAndFlush(any())).willThrow(new RuntimeException("insert failed"));
        willThrow(new BusinessException(ErrorCode.ATTACHMENT_STORAGE_ERROR))
                .given(storage).delete(anyString());

        assertThatThrownBy(() -> service.upload(9L, 1L, 7L, file()))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("insert failed")
                .satisfies(e -> assertThat(e.getSuppressed())
                        .anyMatch(c -> c instanceof BusinessException));

        verify(storage).delete(anyString());
    }

    @Test
    void 저장소_쓰기_실패_시_메타데이터는_저장하지_않는다() {
        doThrow(new BusinessException(ErrorCode.ATTACHMENT_STORAGE_ERROR))
                .when(storage).put(anyString(), any(InputStream.class), anyLong(), anyString());

        assertThatThrownBy(() -> service.upload(9L, 1L, 7L, file()))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.ATTACHMENT_STORAGE_ERROR);
        verify(repository, never()).saveAndFlush(any());
        verify(storage, never()).delete(anyString());
    }
}
