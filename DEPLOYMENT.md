# AWS ECR + ECS Deployment Guide

> Deploy the AI Chat Bot (Node.js backend + React frontend) to AWS using ECR and ECS Fargate.

**Region:** `ap-south-1` (Mumbai)  
**Account ID:** `767903311473`

---

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) installed and configured (`aws configure`)
- [Docker](https://docs.docker.com/get-docker/) installed and running
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster with a connection string ready
- A GitHub repository for CI/CD (optional)

---

## Step 1: Create ECR Repositories

Create two ECR repositories — one for the backend and one for the frontend.

```bash
aws ecr create-repository --repository-name chatbot-backend --region ap-south-1
aws ecr create-repository --repository-name chatbot-frontend --region ap-south-1
```

---

## Step 2: Store Secrets in AWS SSM Parameter Store

Store all sensitive environment variables as encrypted parameters. Replace the placeholder values with your actual secrets.

```bash
aws ssm put-parameter \
  --name "/chatbot/MONGODB_URI" \
  --value "mongodb+srv://user:password@cluster.mongodb.net/chatbot" \
  --type SecureString \
  --region ap-south-1

aws ssm put-parameter \
  --name "/chatbot/JWT_SECRET" \
  --value "your-jwt-secret" \
  --type SecureString \
  --region ap-south-1

aws ssm put-parameter \
  --name "/chatbot/REFRESH_TOKEN_SECRET" \
  --value "your-refresh-token-secret" \
  --type SecureString \
  --region ap-south-1

aws ssm put-parameter \
  --name "/chatbot/GROQ_API_KEY" \
  --value "your-groq-api-key" \
  --type SecureString \
  --region ap-south-1

aws ssm put-parameter \
  --name "/chatbot/TAVILY_API_KEY" \
  --value "your-tavily-api-key" \
  --type SecureString \
  --region ap-south-1
```

---

## Step 3: Create IAM Roles

### a) ECS Task Execution Role (`ecsTaskExecutionRole`)

This role allows ECS to pull images from ECR and read SSM secrets.

1. Go to **IAM → Roles → Create Role**
2. Select **Elastic Container Service Task** as the trusted entity
3. Attach these policies:
   - `AmazonECSTaskExecutionRolePolicy`
   - `AmazonSSMReadOnlyAccess`
4. Name it `ecsTaskExecutionRole`

### b) ECS Task Role (`ecsTaskRole`)

This role is for your application's runtime AWS permissions.

1. Go to **IAM → Roles → Create Role**
2. Select **Elastic Container Service Task** as the trusted entity
3. Attach minimal permissions your app needs (can be empty initially)
4. Name it `ecsTaskRole`

---

## Step 4: Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name chatbot-cluster --region ap-south-1
```

---

## Step 5: Create CloudWatch Log Groups

These are required for container logging.

```bash
aws logs create-log-group --log-group-name /ecs/chatbot-backend --region ap-south-1
aws logs create-log-group --log-group-name /ecs/chatbot-frontend --region ap-south-1
```

---

## Step 6: Build & Push Docker Images

### Login to ECR

```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 767903311473.dkr.ecr.ap-south-1.amazonaws.com
```

### Build & Push Backend

```bash
docker build -t 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-backend:latest ./backend
docker push 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-backend:latest
```

### Build & Push Frontend

Replace `https://your-api-url/api` with your actual production backend URL.

```bash
docker build \
  --build-arg VITE_BASE_URL=https://your-api-url/api \
  -t 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-frontend:latest \
  ./frontend

docker push 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-frontend:latest
```

---

## Step 7: Register Task Definition

The task definition is already configured in `aws/ecs-task-definition.json`.

```bash
aws ecs register-task-definition \
  --cli-input-json file://aws/ecs-task-definition.json \
  --region ap-south-1
```

---

## Step 8: Create ECS Service

Replace `subnet-XXXX` and `sg-XXXX` with your VPC's public subnet ID and security group ID.

```bash
aws ecs create-service \
  --cluster chatbot-cluster \
  --service-name chatbot-service \
  --task-definition chatbot-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXX],securityGroups=[sg-XXXX],assignPublicIp=ENABLED}" \
  --region ap-south-1
```

### Security Group Rules

Your security group should allow:

| Type    | Port | Source    | Purpose          |
|---------|------|-----------|------------------|
| Inbound | 80   | 0.0.0.0/0| Frontend (nginx) |
| Inbound | 8000 | 0.0.0.0/0| Backend API      |

### Finding Your Subnet and Security Group

```bash
# List subnets
aws ec2 describe-subnets --region ap-south-1 --query "Subnets[*].[SubnetId,VpcId,AvailabilityZone]" --output table

# List security groups
aws ec2 describe-security-groups --region ap-south-1 --query "SecurityGroups[*].[GroupId,GroupName]" --output table
```

---

## Step 9: Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster chatbot-cluster \
  --services chatbot-service \
  --region ap-south-1

# Check running tasks
aws ecs list-tasks \
  --cluster chatbot-cluster \
  --service-name chatbot-service \
  --region ap-south-1

# Get task public IP
TASK_ARN=$(aws ecs list-tasks --cluster chatbot-cluster --service-name chatbot-service --region ap-south-1 --query "taskArns[0]" --output text)

ENI_ID=$(aws ecs describe-tasks --cluster chatbot-cluster --tasks $TASK_ARN --region ap-south-1 --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --region ap-south-1 --query "NetworkInterfaces[0].Association.PublicIp" --output text
```

Visit:
- **Frontend:** `http://<PUBLIC_IP>`
- **Backend:** `http://<PUBLIC_IP>:8000/api/health`

---

## Step 10: Set Up CI/CD with GitHub Actions (Optional)

The workflow is already configured in `.github/workflows/deploy.yml`.

### Add GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret Name     | Value                                                |
|-----------------|------------------------------------------------------|
| `AWS_ROLE_ARN`  | Your IAM OIDC role ARN for GitHub Actions            |
| `VITE_BASE_URL` | Production backend URL (e.g. `https://api.example.com/api`) |

### Set Up OIDC Authentication

1. Go to **IAM → Identity providers → Add provider**
2. Provider type: **OpenID Connect**
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. Create an IAM role that trusts this provider with permissions for ECR push and ECS deploy

After setup, every push to `main` will automatically build, push, and deploy.

---

## Local Testing with Docker Compose

Test everything locally before deploying:

```bash
docker-compose up --build
```

- **Frontend:** http://localhost
- **Backend:** http://localhost:8000

---

## Useful Commands

```bash
# Force new deployment (pull latest images)
aws ecs update-service --cluster chatbot-cluster --service chatbot-service --force-new-deployment --region ap-south-1

# View backend logs
aws logs tail /ecs/chatbot-backend --follow --region ap-south-1

# View frontend logs
aws logs tail /ecs/chatbot-frontend --follow --region ap-south-1

# Update an SSM parameter
aws ssm put-parameter --name "/chatbot/GROQ_API_KEY" --value "new-value" --type SecureString --overwrite --region ap-south-1

# Scale service
aws ecs update-service --cluster chatbot-cluster --service chatbot-service --desired-count 2 --region ap-south-1

# Stop service (scale to 0)
aws ecs update-service --cluster chatbot-cluster --service chatbot-service --desired-count 0 --region ap-south-1

# Delete service
aws ecs delete-service --cluster chatbot-cluster --service chatbot-service --force --region ap-south-1
```

---

## Project Structure (Deployment Files)

```
├── .github/workflows/deploy.yml   # CI/CD pipeline
├── aws/ecs-task-definition.json   # ECS Fargate task definition
├── docker-compose.yml             # Local development
├── backend/
│   ├── Dockerfile                 # Backend container
│   └── .dockerignore
└── frontend/
    ├── Dockerfile                 # Frontend container (build + nginx)
    ├── .dockerignore
    └── nginx.conf                 # Nginx config for SPA
```
