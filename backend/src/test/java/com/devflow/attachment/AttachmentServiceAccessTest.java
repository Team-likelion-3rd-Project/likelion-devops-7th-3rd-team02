package com.devflow.attachment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.type.ProjectRole;
import com.devflow.project.entity.Project;
import com.devflow.project.service.ProjectAccessChecker;
import com.devflow.task.entity.Task;
import com.devflow.task.repository.TaskRepository;
import com.devflow.user.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

class AttachmentServiceAccessTest {

    private final TaskAttachmentRepository repository = mock(TaskAttachmentRepository.class);
    private final TaskRepository taskRepository = mock(TaskRepository.class);
    private final ProjectAccessChecker access = mock(ProjectAccessChecker.class);
    private final AttachmentStorage storage = mock(AttachmentStorage.class);
    private final DownloadTokens tokens = mock(DownloadTokens.class);
    private final AttachmentService service = new AttachmentService(
            repository, taskRepository, access, storage,
            new AttachmentProperties("memory", 20, Duration.ofMinutes(5), null, null),
            tokens, Clock.systemUTC(),
            new TransactionTemplate(mock(PlatformTransactionManager.class)));

    private final Task task = mock(Task.class);
    private final Project project = mock(Project.class);
    private final TaskAttachment attachment = mock(TaskAttachment.class);
    private final User uploader = mock(User.class);
    private final ProjectMember member = mock(ProjectMember.class);

    AttachmentServiceAccessTest() {
        given(taskRepository.findById(7L)).willReturn(Optional.of(task));
        given(task.getId()).willReturn(7L);
        given(task.getProject()).willReturn(project);
        given(project.getId()).willReturn(1L);
        given(repository.findByIdAndTaskId(21L, 7L)).willReturn(Optional.of(attachment));
        given(attachment.getUploader()).willReturn(uploader);
        given(attachment.getStorageKey()).willReturn("projects/1/tasks/7/key");
    }

    @Test
    void 팀원이_아니면_삭제_전_403이다() {
        given(access.getMembership(1L, 9L)).willThrow(new BusinessException(ErrorCode.FORBIDDEN));

        assertThatThrownBy(() -> service.delete(9L, 1L, 7L, 21L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void 올린_사람이_아니고_OWNER도_아니면_403이다() {
        given(access.getMembership(1L, 9L)).willReturn(member);
        given(member.getRole()).willReturn(ProjectRole.MEMBER);
        given(uploader.getId()).willReturn(2L);

        assertThatThrownBy(() -> service.delete(9L, 1L, 7L, 21L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
        verify(repository, never()).delete(any());
        verify(storage, never()).delete(anyString());
    }

    @Test
    void 올린_사람이면_삭제하고_저장소_파일도_지운다() {
        given(access.getMembership(1L, 9L)).willReturn(member);
        given(member.getRole()).willReturn(ProjectRole.MEMBER);
        given(uploader.getId()).willReturn(9L);

        service.delete(9L, 1L, 7L, 21L);

        verify(repository).delete(attachment);
        verify(storage).delete("projects/1/tasks/7/key");
    }

    @Test
    void OWNER는_다른_사람_파일도_삭제할_수_있다() {
        given(access.getMembership(1L, 9L)).willReturn(member);
        given(member.getRole()).willReturn(ProjectRole.OWNER);
        given(uploader.getId()).willReturn(2L);

        service.delete(9L, 1L, 7L, 21L);

        verify(repository).delete(attachment);
        verify(storage).delete("projects/1/tasks/7/key");
    }

    @Test
    void 저장소_삭제_실패는_전달되어_롤백으로_메타데이터가_남는다() {
        given(access.getMembership(1L, 9L)).willReturn(member);
        given(member.getRole()).willReturn(ProjectRole.MEMBER);
        given(uploader.getId()).willReturn(9L);
        willThrow(new BusinessException(ErrorCode.ATTACHMENT_STORAGE_ERROR))
                .given(storage).delete("projects/1/tasks/7/key");

        assertThatThrownBy(() -> service.delete(9L, 1L, 7L, 21L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.ATTACHMENT_STORAGE_ERROR);
    }

    @Test
    void 업무에_속하지_않는_첨부는_바로_다운로드도_404다() {
        given(repository.findByIdAndTaskId(21L, 7L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.downloadFile(9L, 1L, 7L, 21L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.ATTACHMENT_NOT_FOUND);
    }

    @Test
    void 팀원이_열면_바로_다운로드가_저장소_내용을_돌려준다() {
        given(attachment.getOriginalName()).willReturn("파일.txt");
        given(attachment.getContentType()).willReturn("text/plain");
        given(attachment.getSizeBytes()).willReturn(6L);
        given(storage.open("projects/1/tasks/7/key"))
                .willReturn(new ByteArrayInputStream("본문".getBytes(StandardCharsets.UTF_8)));

        AttachmentDtos.AttachmentDownload download = service.downloadFile(9L, 1L, 7L, 21L);

        assertThat(download.fileName()).isEqualTo("파일.txt");
        assertThat(download.size()).isEqualTo(6L);
    }
}
