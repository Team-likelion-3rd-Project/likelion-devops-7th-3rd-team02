package com.devflow.user.entity;

import com.devflow.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_users_email",
                        columnNames = "email"
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    /** 소셜 로그인만 쓰는 사용자는 null (이메일 로그인 불가) */
    @Column(length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    public User(String email, String password, String name) {
        this.email = email;
        this.password = password;
        this.name = name;
    }

    /** 소셜 로그인으로 처음 가입하는 사용자 (비밀번호 없음) */
    public static User social(String email, String name) {
        return new User(email, null, name);
    }

    public boolean hasPassword() {
        return password != null && !password.isBlank();
    }
}