# VUC Cloud Run Production Gate

## Purpose

This document defines the evidence required before VUC is described as an externally reachable production service.

## Required evidence

1. A deployed Cloud Run revision.
2. A public HTTPS URL for that revision.
3. TLS served by the public endpoint.
4. `GET /health` returns HTTP 200.
5. `GET /ready` returns HTTP 200.
6. `GET /api/openapi.json` returns HTTP 200.
7. The smoke workflow passes against the public URL.
8. Authentication/authorization is validated separately; HTTPS alone is not an authentication control.
9. No production secret is committed to the repository or embedded in the container image.

## Deployment

Build and push the image to Artifact Registry, deploy it to Cloud Run, then run the manually triggered smoke workflow with the resulting HTTPS URL.

Example:

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT/vuc/vuc:TAG .
gcloud run deploy vuc --image REGION-docker.pkg.dev/PROJECT/vuc/vuc:TAG --region REGION --port 8080 --allow-unauthenticated
```

For an authenticated deployment, replace the ingress/IAM settings with the intended identity model.

## Status semantics

- **PASS**: all required public endpoint evidence exists.
- **NOT VALIDATED**: deployment credentials or public URL are absent.
- A local server is never accepted as evidence for this gate.

## Security boundary

This gate proves transport/reachability only. OAuth 2.1, tenant isolation, production secret management and cloud integration remain independent gates.
