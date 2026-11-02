package com.devflow.attachment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

class S3AttachmentStorageTest {

    private final S3Client s3 = mock(S3Client.class);
    private final S3AttachmentStorage storage =
            new S3AttachmentStorage(s3, mock(S3Presigner.class), "devflow-dev-attachment");

    @Test
    void 삭제에_성공하면_예외가_없다() {
        assertThatCode(() -> storage.delete("projects/1/tasks/7/key")).doesNotThrowAnyException();
        verify(s3).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void S3_삭제_실패는_호출자에게_전달한다() {
        given(s3.deleteObject(any(DeleteObjectRequest.class)))
                .willThrow(S3Exception.builder().message("Access Denied").build());

        assertThatThrownBy(() -> storage.delete("projects/1/tasks/7/key"))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.ATTACHMENT_STORAGE_ERROR);
    }

    @Test
    void 이미_삭제된_객체_삭제는_성공으로_친다() {
        willThrow(NoSuchKeyException.builder().message("no such key").build())
                .given(s3).deleteObject(any(DeleteObjectRequest.class));

        assertThatCode(() -> storage.delete("projects/1/tasks/7/gone")).doesNotThrowAnyException();
    }
}
