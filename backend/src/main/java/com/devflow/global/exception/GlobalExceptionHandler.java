package com.devflow.global.exception;

import com.devflow.global.response.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

        @Value("${spring.servlet.multipart.max-file-size:10MB}")
        private String maxFileSize;

        // 첨부파일(A2) 크기 제한 초과
        @ExceptionHandler(MaxUploadSizeExceededException.class)
        public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException exception) {
                return toResponse(ErrorCode.ATTACHMENT_TOO_LARGE, "파일은 " + maxFileSize + " 이하만 올릴 수 있습니다.");
        }

        @ExceptionHandler(MissingServletRequestPartException.class)
        public ResponseEntity<ErrorResponse> handleMissingPart(MissingServletRequestPartException exception) {
                return toResponse(ErrorCode.INVALID_REQUEST,
                                "요청 값 '" + exception.getRequestPartName() + "'이(가) 필요합니다.");
        }

        @ExceptionHandler(MultipartException.class)
        public ResponseEntity<ErrorResponse> handleMultipart(MultipartException exception) {
                return toResponse(ErrorCode.INVALID_REQUEST, "파일은 multipart/form-data로 보내 주세요.");
        }

        @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
        public ResponseEntity<ErrorResponse> handleMediaType(HttpMediaTypeNotSupportedException exception) {
                return toResponse(ErrorCode.INVALID_REQUEST, "지원하지 않는 요청 형식입니다.");
        }

        @ExceptionHandler(BusinessException.class)
        public ResponseEntity<ErrorResponse> handleBusinessException(
                        BusinessException exception) {
                return toResponse(exception.getErrorCode(), exception.getMessage());
        }

        // @Valid 검증 실패: 첫 번째 필드 오류 메시지를 그대로 전달
        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ErrorResponse> handleValidationException(
                        MethodArgumentNotValidException exception) {
                String message = exception.getBindingResult()
                                .getFieldErrors()
                                .stream()
                                .findFirst()
                                .map(error -> error.getDefaultMessage())
                                .orElse(ErrorCode.INVALID_REQUEST.getMessage());

                return toResponse(ErrorCode.INVALID_REQUEST, message);
        }

        // JSON 형식 오류, 정의되지 않은 enum 값(예: status "DOING") 등
        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ErrorResponse> handleNotReadable(
                        HttpMessageNotReadableException exception) {
                return toResponse(ErrorCode.INVALID_REQUEST, "요청 본문의 형식이 올바르지 않습니다.");
        }

        // path·query 값의 타입 오류 (예: /api/projects/abc)
        @ExceptionHandler(MethodArgumentTypeMismatchException.class)
        public ResponseEntity<ErrorResponse> handleTypeMismatch(
                        MethodArgumentTypeMismatchException exception) {
                return toResponse(
                                ErrorCode.INVALID_REQUEST,
                                "요청 값 '" + exception.getName() + "'의 형식이 올바르지 않습니다.");
        }

        @ExceptionHandler(MissingServletRequestParameterException.class)
        public ResponseEntity<ErrorResponse> handleMissingParameter(
                        MissingServletRequestParameterException exception) {
                return toResponse(
                                ErrorCode.INVALID_REQUEST,
                                "요청 값 '" + exception.getParameterName() + "'이(가) 필요합니다.");
        }

        // 없는 경로 (Spring 6.1+에서는 예외로 전달되어 기존에는 500이 됐음)
        @ExceptionHandler(NoResourceFoundException.class)
        public ResponseEntity<ErrorResponse> handleNoResource(
                        NoResourceFoundException exception) {
                return toResponse(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.getMessage());
        }

        @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
        public ResponseEntity<ErrorResponse> handleMethodNotSupported(
                        HttpRequestMethodNotSupportedException exception) {
                return toResponse(ErrorCode.METHOD_NOT_ALLOWED, ErrorCode.METHOD_NOT_ALLOWED.getMessage());
        }

        // 예상하지 못한 오류: 원인을 로그(stdout)에 남기고, 응답에는 내부 정보를 노출하지 않음
        @ExceptionHandler(Exception.class)
        public ResponseEntity<ErrorResponse> handleException(
                        Exception exception) {
                log.error("Unhandled exception", exception);
                return toResponse(
                                ErrorCode.INTERNAL_SERVER_ERROR,
                                ErrorCode.INTERNAL_SERVER_ERROR.getMessage());
        }

        private ResponseEntity<ErrorResponse> toResponse(ErrorCode errorCode, String message) {
                return ResponseEntity
                                .status(errorCode.getStatus())
                                .body(ErrorResponse.of(errorCode.getCode(), message));
        }
}
