package com.devflow.global.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.devflow.global.response.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void 비즈니스_예외는_ErrorCode의_상태와_코드로_응답한다() {
        ResponseEntity<ErrorResponse> response =
                handler.handleBusinessException(new BusinessException(ErrorCode.TASK_NOT_FOUND));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody().getCode()).isEqualTo("TASK_NOT_FOUND");
    }

    @Test
    void 잘못된_JSON이나_enum_값은_500이_아니라_400으로_응답한다() {
        HttpMessageNotReadableException exception = new HttpMessageNotReadableException(
                "invalid", new MockHttpInputMessage(new byte[0]));

        ResponseEntity<ErrorResponse> response = handler.handleNotReadable(exception);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().getCode()).isEqualTo("INVALID_REQUEST");
    }

    @Test
    void 필수_파라미터_누락은_400으로_응답한다() {
        ResponseEntity<ErrorResponse> response = handler.handleMissingParameter(
                new MissingServletRequestParameterException("page", "int"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().getMessage()).contains("page");
    }

    @Test
    void 지원하지_않는_메서드는_405로_응답한다() {
        ResponseEntity<ErrorResponse> response = handler.handleMethodNotSupported(
                new HttpRequestMethodNotSupportedException("PUT"));

        assertThat(response.getStatusCode().value()).isEqualTo(405);
        assertThat(response.getBody().getCode()).isEqualTo("METHOD_NOT_ALLOWED");
    }

    @Test
    void 예상하지_못한_오류는_내부_정보_없이_500으로_응답한다() {
        ResponseEntity<ErrorResponse> response =
                handler.handleException(new IllegalStateException("db password=secret"));

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().getCode()).isEqualTo("INTERNAL_SERVER_ERROR");
        assertThat(response.getBody().getMessage()).doesNotContain("secret");
    }
}
