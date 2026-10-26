"""Summarize a successful image scan; vulnerability findings are report-only in M4."""

import json
import os
import re
from pathlib import Path


def main():
    component = os.environ['COMPONENT']
    if component not in {'backend', 'frontend'}:
        raise ValueError('Unsupported component')
    directory = Path(os.environ['REPORT_DIR'])
    report_path = directory / f'trivy-{component}.json'
    report = json.loads(report_path.read_text(encoding='utf-8'))
    counts = {s: 0 for s in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')}
    fixable = dict.fromkeys(counts, 0)
    for result in report.get('Results') or []:
        for vulnerability in result.get('Vulnerabilities') or []:
            severity = vulnerability.get('Severity', 'UNKNOWN').upper()
            if severity not in counts:
                severity = 'UNKNOWN'
            counts[severity] += 1
            if (vulnerability.get('FixedVersion') or '').strip():
                fixable[severity] += 1

    pull_request = os.environ['GITHUB_EVENT_NAME'] == 'pull_request'
    digest = os.environ.get('IMAGE_DIGEST', '')
    if not pull_request and not re.fullmatch(r'sha256:[0-9a-f]{64}', digest):
        raise ValueError('Published image digest is missing or invalid')
    image = (f"{os.environ['IMAGE_NAME']}@{digest}" if not pull_request
             else f'local Docker archive: image-{component}.tar')
    metadata = {
        'component': component,
        'scan_target': image,
        'target_kind': 'local-archive' if pull_request else 'registry-digest',
        'repository': os.environ['GITHUB_REPOSITORY'],
        'event': os.environ['GITHUB_EVENT_NAME'],
        'commit': os.environ['GITHUB_SHA'],
        'run_id': os.environ['GITHUB_RUN_ID'],
        'run_attempt': os.environ['GITHUB_RUN_ATTEMPT'],
        'trivy_version': 'v0.70.0',
        'policy': 'report-only; scan errors fail the job',
        'scan_created_at': report.get('CreatedAt'),
        'trivy_database': report.get('Metadata', {}).get('DB'),
        'finding_counts': counts,
        'findings_with_fixed_version': fixable,
    }
    (directory / f'trivy-{component}-metadata.json').write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    lines = [f'### Trivy — {component}', '', f'Target: `{image}`', '',
             'Policy: report only. A successful scan does not mean zero vulnerabilities.', '',
             '| Severity | Findings | With fixed version |', '|---|---:|---:|']
    lines.extend(f'| {s} | {counts[s]} | {fixable[s]} |' for s in counts)
    lines += ['', 'Counts are package findings, not unique CVEs.',
              'Only dependencies present in the final image are covered.', '']
    with Path(os.environ['GITHUB_STEP_SUMMARY']).open('a', encoding='utf-8') as stream:
        stream.write('\n'.join(lines))


if __name__ == '__main__':
    main()
