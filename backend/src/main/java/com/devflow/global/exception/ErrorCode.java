package com.devflow.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    INVALID_REQUEST(
            HttpStatus.BAD_REQUEST,
            "INVALID_REQUEST",
            "잘못된 요청입니다."
    ),

    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "UNAUTHORIZED",
            "인증이 필요합니다."
    ),

    FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
            "접근 권한이 없습니다."
    ),

    NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "NOT_FOUND",
            "요청한 리소스를 찾을 수 없습니다."
    ),

    DUPLICATE_EMAIL(
            HttpStatus.CONFLICT,
            "DUPLICATE_EMAIL",
            "이미 사용 중인 이메일입니다."
    ),

    INVALID_CREDENTIALS(
            HttpStatus.UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "이메일 또는 비밀번호가 올바르지 않습니다."
    ),
    DUPLICATE_PROJECT_MEMBER(
            HttpStatus.CONFLICT,
            "DUPLICATE_PROJECT_MEMBER",
            "이미 프로젝트에 등록된 사용자입니다."
    ),

    PROJECT_MEMBER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "PROJECT_MEMBER_NOT_FOUND",
            "프로젝트 멤버를 찾을 수 없습니다."
    ),
    TASK_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "TASK_NOT_FOUND",
            "업무를 찾을 수 없습니다."
    ),

    INVALID_TASK_ASSIGNEE(
            HttpStatus.BAD_REQUEST,
            "INVALID_TASK_ASSIGNEE",
            "프로젝트에 참여하지 않은 사용자는 담당자로 지정할 수 없습니다."
    ),
    INTERNAL_SERVER_ERROR(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "INTERNAL_SERVER_ERROR",
            "서버 내부 오류가 발생했습니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}