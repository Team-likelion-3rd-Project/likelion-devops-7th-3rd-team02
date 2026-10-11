package com.devflow.member.dto;

import com.devflow.member.entity.ProjectMember;

public record ProjectMemberResponse(
        Long memberId,
        Long userId,
        String email,
        String name,
        String role
) {

    public static ProjectMemberResponse from(
            ProjectMember projectMember
    ) {
        return new ProjectMemberResponse(
                projectMember.getId(),
                projectMember.getUser().getId(),
                projectMember.getUser().getEmail(),
                projectMember.getUser().getName(),
                projectMember.getRole().name()
        );
    }
}