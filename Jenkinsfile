// EventHub CI/CD pipeline: GitHub -> Jenkins -> Docker -> Kubernetes
// Works on a Windows Jenkins agent (bat) and a Linux agent (sh) without changes.
// Requirements on the Jenkins machine: Git, Node.js 20+, Docker CLI, kubectl, curl,
// and a kubectl context pointing at the cluster (e.g. docker-desktop).

def runCmd(String cmd) {
  if (isUnix()) { sh cmd } else { bat cmd }
}

def runOut(String cmd) {
  // "@" stops Windows from echoing the command into the captured output
  return isUnix() ? sh(script: cmd, returnStdout: true).trim()
                  : bat(script: "@${cmd}", returnStdout: true).trim()
}

pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  // A local Jenkins (localhost) cannot receive GitHub webhooks, so poll GitHub every ~2 minutes.
  // If Jenkins has a public URL, replace this with a GitHub webhook.
  triggers {
    pollSCM('H/2 * * * *')
  }

  environment {
    IMAGE_NAME = 'eventhub'
    IMAGE_TAG  = "${env.BUILD_NUMBER}"
    APP_URL    = 'http://localhost:30080'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHORT = runOut('git rev-parse --short HEAD')
          echo "Building commit ${env.GIT_SHORT} as ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        }
      }
    }

    stage('Install') {
      steps {
        runCmd 'npm ci'
      }
    }

    stage('Validate') {
      steps {
        runCmd 'npm run lint'   // TypeScript type check
        runCmd 'npm test'       // unit tests for event/registration rules
      }
    }

    stage('Build Application') {
      steps {
        runCmd 'npm run build'
      }
    }

    stage('Build Docker Image') {
      steps {
        runCmd "docker build -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} -t ${env.IMAGE_NAME}:latest ."
        runCmd "docker image ls ${env.IMAGE_NAME}"
      }
    }

    stage('Security Scan') {
      steps {
        // DevSecOps: report known vulnerabilities. Findings mark this stage UNSTABLE (yellow)
        // but do not stop deployment. To enforce, remove the catchError wrappers.
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          runCmd 'npm audit --omit=dev --audit-level=high'
        }
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          runCmd "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache aquasec/trivy:latest image --severity HIGH,CRITICAL --ignore-unfixed --no-progress --exit-code 1 ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        }
      }
    }
    stage('Deploy to Kubernetes') {
      steps {
        script {
          // Put this build's image tag and version label into the Deployment manifest
          def manifest = readFile('k8s/deployment.yaml')
            .replace('image: eventhub:dev', "image: ${env.IMAGE_NAME}:${env.IMAGE_TAG}")
            .replace('value: "dev"', "value: \"build-${env.IMAGE_TAG}\"")
          writeFile file: 'rendered-deployment.yaml', text: manifest
          env.DEPLOYED = 'true'
        }
        runCmd 'kubectl apply -f rendered-deployment.yaml -f k8s/service.yaml'
        runCmd 'kubectl rollout status deployment/eventhub --timeout=180s'
      }
    }

    stage('Verify') {
      steps {
        runCmd 'kubectl get deployments,pods,services -l app=eventhub -o wide'
        retry(5) {
          sleep(time: 3, unit: 'SECONDS')
          runCmd "curl -fsS ${env.APP_URL}/api/health"
        }
      }
    }
  }

  post {
    success {
      echo "EventHub build ${env.IMAGE_TAG} (commit ${env.GIT_SHORT}) is live at ${env.APP_URL}"
    }
    failure {
      script {
        if (env.DEPLOYED == 'true') {
          echo 'Deployment failed verification - rolling back to the previous ReplicaSet.'
          try {
            runCmd 'kubectl rollout undo deployment/eventhub'
          } catch (err) {
            echo "No earlier version to roll back to (first deployment?): ${err}"
          }
        } else {
          echo 'Pipeline failed before deployment - the running version was not touched.'
        }
      }
    }
  }
}
