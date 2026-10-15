package com.devflow.incident.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import com.devflow.incident.type.IncidentSeverity;
import com.devflow.incident.type.IncidentStatus;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class IncidentTest {

    private final LocalDateTime t0 = LocalDateTime.of(2026, 10, 15, 12, 48);

    private Incident newIncident() {
        Incident incident = Incident.open(null, "fp", "dev", IncidentSeverity.WARNING, t0);
        incident.describe("제목", IncidentSeverity.WARNING, null, null, null, null, null);
        return incident;
    }

    @Test
    void 새_장애는_OPEN이고_울리는_중이다() {
        Incident incident = newIncident();

        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.OPEN);
        assertThat(incident.isFiring()).isTrue();
        assertThat(incident.getSource()).isEqualTo("Alertmanager");
    }

    @Test
    void 이미_확인된_장애를_다시_확인하면_처음_확인_시각을_유지한다() {
        Incident incident = newIncident();
        incident.acknowledge(t0.plusMinutes(1));
        incident.acknowledge(t0.plusMinutes(5));

        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.ACKNOWLEDGED);
        assertThat(incident.getAcknowledgedAt()).isEqualTo(t0.plusMinutes(1));
    }

    @Test
    void 해결된_장애는_확인_담당자지정_해결_모두_409() {
        Incident incident = newIncident();
        incident.resolve(t0.plusMinutes(2));

        assertThatThrownBy(() -> incident.acknowledge(t0)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> incident.assignTo(null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> incident.resolve(t0)).isInstanceOf(BusinessException.class);
    }

    @Test
    void 알림이_풀렸다가_다시_울리면_풀린_시각을_지운다() {
        Incident incident = newIncident();
        incident.markFiringEnded(t0.plusMinutes(10));
        assertThat(incident.isFiring()).isFalse();

        incident.markFiring();
        assertThat(incident.isFiring()).isTrue();
        assertThat(incident.getFiringEndedAt()).isNull();
    }
}
