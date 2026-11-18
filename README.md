# EventHub: College Event Management & Registration System

**21IPE333P Essentials in Cloud and DevOps · SRMIST**

EventHub is a small Next.js web app for discovering and registering for campus events. It is shipped through an automated DevOps pipeline:
**GitHub → Jenkins → Docker → Kubernetes**, plus an **automated Blue-Green deployment** with approval and rollback.

> **Prototype limits (say this in the viva):** data is kept in the browser's `localStorage`, so it is **not** a shared database. Another browser won't see the same registrations. There is **no real login**: the "demo student name" box just simulates different students. The local Kubernetes cluster has a single node and is not production high-availability.

---

## 1. What's in the project

```
EventHub/
├── app/
│   ├── layout.tsx, page.tsx, globals.css   UI shell and styles
│   └── api/health/route.ts                 GET /api/health → {status, version, color, hostname}
├── components/EventHubApp.tsx              Events, My Events and Organizer screens
├── lib/store.ts                            Business rules (register, capacity, add/remove) + localStorage
├── lib/buildInfo.ts                        Reads APP_VERSION / APP_COLOR / POD_NAME from env
├── tests/store.test.ts                     11 unit tests (run in Jenkins "Validate" stage)
├── Dockerfile, .dockerignore               Multi-stage image (node:22-alpine, non-root, healthcheck)
├── Jenkinsfile                             CI/CD pipeline → Kubernetes (5-mark VLE)
├── Jenkinsfile.bluegreen                   Automated Blue-Green pipeline (5-mark VLE)
├── k8s/
│   ├── deployment.yaml, service.yaml       Main app (NodePort 30080)
│   ├── blue-green/                         Blue & Green Deployments, live Service (30090), preview Service (30091), patches/
│   └── practice/pod-test.yaml              "Simple Pod YAML" practice item
├── scripts/
│   ├── bluegreen.ps1 / bluegreen.sh        Manual status / switch / rollback
│   └── deploy.sh                           Shell deployment on a Linux/EC2 host
├── aws/                                    AWS part, run from AWS CloudShell (see aws/README.md)
│   ├── cli/                                AWS CLI infrastructure demo
│   ├── terraform/                          EC2, EBS, S3, IAM, CloudWatch as code
│   └── ansible/                            Server setup + app deployment + monitoring + backups
└── docs/ecommerce-deployment-failure-case.md   Written answer for the case-scenario VLE
```

**Features:** browse events, search, filter by category, view details, register/cancel (blocks duplicates, enforces capacity), My Events (still there after a refresh), organizer create/remove event, totals for events, registrations and students, and a "Reset demo data" button. The coloured strip and the version badge in the header show which version and colour (blue/green) served the page.

---

## 2. Install these on your Windows 11 laptop (Phase 0)

| Tool | Check command | Notes |
|---|---|---|
| Git | `git --version` | |
| Node.js 22 LTS | `node -v` (20 or newer) | Includes npm |
| Docker Desktop | `docker info` | Settings → **Kubernetes → Enable Kubernetes**. If it asks for a cluster type, choose **kubeadm** so the cluster can see images you build locally. |
| kubectl | `kubectl get nodes` | Comes with Docker Desktop. Should show `docker-desktop   Ready` |
| Java 21 | `java -version` | Needed by Jenkins |
| Jenkins LTS (`jenkins.war`) | see section 7 | |

📸 *Evidence:* a screenshot of all the version commands.

---

## 3. Run the app locally (Phases 1–2)

```powershell
cd EventHub
npm install          # first time only: this CREATES package-lock.json
npm test             # 11 tests should pass
npm run lint         # TypeScript check, no output = OK
npm run dev          # open http://localhost:3000
```

> ⚠️ **Commit `package-lock.json`.** The Dockerfile and Jenkins use `npm ci`, and `npm ci` fails if there's no lockfile.

**Smoke test (FR-01 to FR-09):** type a student name → search "hack" → filter by Sports → Register → open My Events → refresh (it's still there) → Organizer → create an event → check the counts → remove an event. Also open http://localhost:3000/api/health.

---

## 4. Push to GitHub (Phase 3)

```powershell
git init
git add .
git commit -m "EventHub: initial app, Docker, Jenkins and Kubernetes files"
git branch -M main
git remote add origin https://github.com/realaps/eventhub.git
git push -u origin main
```
A **public** repo is easiest for Jenkins. If it's private, add a GitHub Personal Access Token in Jenkins Credentials. Never put the token in the Jenkinsfile.

---

## 5. Docker (Phase 4)

```powershell
docker build -t eventhub:dev .
docker image ls eventhub
docker run --rm -p 3000:3000 eventhub:dev      # http://localhost:3000   (Ctrl+C to stop)
```
📸 *Evidence:* the build output, `docker image ls`, and the app opened from the container.

---

## 6. Kubernetes by hand (Phase 5)

```powershell
kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml
kubectl rollout status deployment/eventhub
kubectl get deployments,pods,services -o wide
```
Open **http://localhost:30080**. The footer shows the Pod name. Refresh a few times and you may see the other replica answer.

Useful commands: `kubectl describe pod <name>`, `kubectl logs deployment/eventhub`, `kubectl delete -f k8s/deployment.yaml -f k8s/service.yaml`.

Pod practice: `kubectl apply -f k8s/practice/pod-test.yaml` then `kubectl port-forward pod/eventhub-test 3001:3000`.

📸 *Evidence:* `kubectl get pods` showing Running 1/1 and the browser at port 30080.

---

## 7. Jenkins CI/CD (Phases 6–7, **5 marks**)

**Why not install Jenkins as a Windows service?** A Jenkins service runs as a different Windows account, so it usually **can't see your Docker Desktop or your `kubectl` config**. Run it as *you* instead:

```powershell
mkdir C:\jenkins; cd C:\jenkins
# download jenkins.war (LTS) from https://www.jenkins.io/download/ into this folder
java -jar jenkins.war --httpPort=8080
```
1. Open http://localhost:8080 and unlock it with the password printed in the terminal.
2. Choose **Install suggested plugins** and create an admin user.
3. **New Item** → name `eventhub-cicd` → **Pipeline** → OK.
4. Under Pipeline: **Definition: Pipeline script from SCM** → SCM **Git** → your repo URL → Branch `*/main` → **Script Path `Jenkinsfile`** → Save.
5. Click **Build Now**. The first run also turns on polling: from then on, Jenkins checks GitHub every ~2 minutes.

**Pipeline stages:** Checkout → Install (`npm ci`) → Validate (type check + unit tests) → Build Application → Build Docker Image (`eventhub:<build#>`) → Deploy to Kubernetes (`kubectl apply` + `rollout status`) → Verify (`curl /api/health`). If verification fails, Jenkins runs **`kubectl rollout undo`** automatically.

**Show the automation working:**
- Change a small piece of UI text (e.g. the subtitle in `components/EventHubApp.tsx`), commit and push. A new build starts by itself and the version badge changes to `build-N`.
- **Show a failed build stops deployment:** in `tests/store.test.ts`, change `>= 4` to `>= 99`, then push. The build fails at **Validate** and the live app is untouched. Revert the change afterwards.

📸 *Evidence:* the Stage View with all stages green, the Console Output, a failed build stopped at Validate, `kubectl get pods`, and the browser.

---

## 8. Blue-Green deployment (Phase 10, **5 marks**)

| Thing | URL / name |
|---|---|
| LIVE service (what users open) | http://localhost:30090 → `eventhub-bg` |
| PREVIEW service (the idle colour) | http://localhost:30091 → `eventhub-bg-preview` |
| Deployments | `eventhub-blue`, `eventhub-green` |

How it works: both versions run at the same time. The live Service's **selector** (`track: blue` or `track: green`) decides which one gets traffic. Switching is instant, and rolling back is just switching the selector back.

### 8a. Manual demo (do this first so you understand it)
```powershell
docker build -t eventhub:v1 .
# make a small visible change (e.g. subtitle text), then:
docker build -t eventhub:v2 .

kubectl apply -f k8s/blue-green/
kubectl rollout status deployment/eventhub-blue
kubectl rollout status deployment/eventhub-green

.\scripts\bluegreen.ps1 status          # LIVE = blue, strip is blue, badge "v1 · blue"
# check green on the preview URL: http://localhost:30091
.\scripts\bluegreen.ps1 switch green    # go live with v2
.\scripts\bluegreen.ps1 switch blue     # ROLLBACK
```
(The raw command, for the viva: `kubectl patch service eventhub-bg --patch-file k8s/blue-green/patches/patch-green.yaml`)

> Note: `kubectl apply -f k8s/blue-green/` resets the live selector to blue. After the first setup, use the script or the Jenkins pipeline to switch.

### 8b. Automated with Jenkins
New Item → `eventhub-bluegreen` → Pipeline → from SCM, same repo, **Script Path `Jenkinsfile.bluegreen`**.

Each run:
1. Finds the LIVE colour.
2. Builds `eventhub:bg-<build#>` and deploys it to the **idle** colour.
3. Runs a health check *inside* the new Pod, which must report the right colour.
4. Points the preview service at the new colour.
5. **Pauses for approval.** Click *Switch traffic* (tick `AUTO_SWITCH` to skip this).
6. Switches the live selector.
7. Checks the live URL now serves the new colour.
8. **Rolls back automatically** if that check fails. The old colour stays running for an instant manual rollback.

The first run sets up blue. Run it again to see blue → green, and again for green → blue.

📸 *Evidence:* `kubectl get deploy -L track` showing both colours, the live service selector before and after, the approval step in Jenkins, the browser before and after (blue strip → green strip), and a rollback.

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm ci` fails: "requires a package-lock.json" | Run `npm install` locally, then commit and push `package-lock.json` |
| Pod status `ErrImagePull` / `ImagePullBackOff` | The cluster can't see your local image. Use Docker Desktop's kubeadm cluster, or push the image to Docker Hub and use that name in the YAML |
| Jenkins: `'docker' is not recognized` / `kubectl` not found | Jenkins can't find the tool on its PATH: run Jenkins from your own terminal (section 7), or add the folders under *Manage Jenkins → System → Global properties → Environment variables* |
| Jenkins: `error during connect` / docker pipe permission | Start Docker Desktop, and don't run Jenkins as a Windows service |
| kubectl: `connection refused` to the cluster | Kubernetes isn't running in Docker Desktop, or the context is wrong: `kubectl config use-context docker-desktop` |
| Port 30080/30090 doesn't open | `kubectl get svc`, check the Pods are Ready (`kubectl describe pod`), and use `localhost`, not 127.0.0.1, on some setups |
| Build never starts after a push | Polling runs every ~2 min, and only after the first manual build. GitHub webhooks can't reach `localhost` |

---

## 10. Status

| Phase | Status |
|---|---|
| App, unit tests, health endpoint | ✅ Built. Unit tests and browser tests pass |
| Dockerfile, Jenkinsfile, Kubernetes manifests | ✅ Written. **Run them on your laptop for the first time and capture evidence** |
| Blue-Green manifests, pipeline, scripts | ✅ Written. Same: needs running and evidence |
| AWS CLI, Terraform, Ansible, EC2/EBS/S3/IAM/CloudWatch, log monitoring | ✅ Written. **Follow `aws/README.md`** (runs in AWS CloudShell) |
| E-commerce failure case scenario | ✅ `docs/ecommerce-deployment-failure-case.md` |
