# AWS ECS Deployment Guide — AI Chatbot (MERN Stack)

> Single ALB + Path-based routing approach.  
> Frontend and Backend run as **separate ECS services** behind **one Application Load Balancer**.

---

## Architecture Overview

```
                        ┌──────────────────────────┐
                        │      Route 53 / Domain    │
                        └────────────┬───────────────┘
                                     │
                        ┌────────────▼───────────────┐
                        │   Application Load Balancer │
                        │        (chatbot-alb)        │
                        │                             │
                        │  Rule 1: /api/*  → Backend  │
                        │  Default: /*     → Frontend │
                        └──────┬──────────────┬───────┘
                               │              │
                    ┌──────────▼──┐     ┌─────▼──────────┐
                    │  Backend    │     │   Frontend      │
                    │  ECS Service│     │   ECS Service   │
                    │  Port 8000  │     │   Port 80       │
                    │  (Node.js)  │     │   (nginx + SPA) │
                    └─────────────┘     └─────────────────┘
```

**Why this approach?**

- Same origin → no CORS issues, cookies work seamlessly
- SSE/streaming works → ALB forwards POST directly to backend
- Cheaper → one ALB instead of two
- Simpler → nginx only serves static files, no broken proxy

---

## Prerequisites

- AWS CLI configured (`aws configure`)
- Docker installed
- Two ECR repositories created:
  - `chatbot-backend`
  - `chatbot-frontend`
- AWS region: `ap-south-1` (Mumbai) — adjust if different

---

## Step 1: Build Docker Images

### 1.1 Build Backend Image

```bash
docker build -t chatbot-backend ./backend
```

### 1.2 Build Frontend Image

> **Critical**: Set `VITE_BASE_URL=/api` (relative path, NOT an absolute URL).  
> This ensures all API calls go to the same origin through the ALB.

```bash
docker build --build-arg VITE_BASE_URL=/api -t chatbot-frontend ./frontend
```

---

## Step 2: Push Images to ECR

### 2.1 Login to ECR

```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 767903311473.dkr.ecr.ap-south-1.amazonaws.com
```

### 2.2 Tag Images

```bash
docker tag chatbot-backend:latest 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-backend:latest

docker tag chatbot-frontend:latest 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-frontend:latest
```

### 2.3 Push Images

```bash
docker push 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-backend:latest

docker push 767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-frontend:latest
```

---

## Step 3: Create IAM Roles (if not already created)

### 3.1 ECS Task Execution Role

1. Go to **IAM → Roles → Create Role**
2. Trusted entity: **Elastic Container Service Task**
3. Attach policy: `AmazonECSTaskExecutionRolePolicy`
4. If using SSM secrets, also attach:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["ssm:GetParameters", "secretsmanager:GetSecretValue"],
         "Resource": "*"
       }
     ]
   }
   ```
5. Name: `ecsTaskExecutionRole`

---

## Step 4: Store Secrets in AWS Systems Manager Parameter Store

Go to **AWS Systems Manager → Parameter Store** and create these **SecureString** parameters:

| Parameter Name                          | Value                          |
| --------------------------------------- | ------------------------------ |
| `/chatbot-backend/MONGODB_URI`          | Your MongoDB connection string |
| `/chatbot-backend/JWT_SECRET`           | Your JWT secret                |
| `/chatbot-backend/REFRESH_TOKEN_SECRET` | Your refresh token secret      |
| `/chatbot-backend/GROQ_API_KEY`         | Your Groq API key              |
| `/chatbot-backend/TAVILY_API_KEY`       | Your Tavily API key            |

```bash
# Example CLI commands
aws ssm put-parameter --name "/chatbot-backend/MONGODB_URI" --value "mongodb+srv://..." --type SecureString --region ap-south-1

aws ssm put-parameter --name "/chatbot-backend/JWT_SECRET" --value "your-jwt-secret" --type SecureString --region ap-south-1

aws ssm put-parameter --name "/chatbot-backend/REFRESH_TOKEN_SECRET" --value "your-refresh-secret" --type SecureString --region ap-south-1

aws ssm put-parameter --name "/chatbot-backend/GROQ_API_KEY" --value "gsk_..." --type SecureString --region ap-south-1

aws ssm put-parameter --name "/chatbot-backend/TAVILY_API_KEY" --value "tvly-..." --type SecureString --region ap-south-1
```

---

## Step 5: Create CloudWatch Log Groups

```bash
aws logs create-log-group --log-group-name /ecs/chatbot-backend --region ap-south-1

aws logs create-log-group --log-group-name /ecs/chatbot-frontend --region ap-south-1
```

---

## Step 6: Create Security Groups

### 6.1 ALB Security Group (`chatbot-alb-sg`)

1. Go to **EC2 → Security Groups → Create**
2. Inbound rules:

| Type  | Port | Source                        |
| ----- | ---- | ----------------------------- |
| HTTP  | 80   | 0.0.0.0/0                     |
| HTTPS | 443  | 0.0.0.0/0 (add later for SSL) |

3. Outbound: Allow all

### 6.2 Backend Service Security Group (`chatbot-backend-sg`)

| Type       | Port | Source                                |
| ---------- | ---- | ------------------------------------- |
| Custom TCP | 8000 | `chatbot-alb-sg` (ALB security group) |

### 6.3 Frontend Service Security Group (`chatbot-frontend-sg`)

| Type       | Port | Source                                |
| ---------- | ---- | ------------------------------------- |
| Custom TCP | 80   | `chatbot-alb-sg` (ALB security group) |

---

## Step 7: Create Target Groups

Go to **EC2 → Target Groups → Create Target Group**

### 7.1 Backend Target Group

| Setting               | Value                |
| --------------------- | -------------------- |
| Target type           | IP addresses         |
| Name                  | `chatbot-backend-tg` |
| Protocol              | HTTP                 |
| Port                  | 8000                 |
| VPC                   | Your VPC             |
| Health check path     | `/api/health`        |
| Health check interval | 30s                  |
| Healthy threshold     | 2                    |
| Unhealthy threshold   | 3                    |

**After creation → Edit Attributes:**

- Deregistration delay: `300` seconds
- Stickiness: Disabled

### 7.2 Frontend Target Group

| Setting               | Value                 |
| --------------------- | --------------------- |
| Target type           | IP addresses          |
| Name                  | `chatbot-frontend-tg` |
| Protocol              | HTTP                  |
| Port                  | 80                    |
| VPC                   | Your VPC              |
| Health check path     | `/`                   |
| Health check interval | 30s                   |
| Healthy threshold     | 2                     |
| Unhealthy threshold   | 3                     |

---

## Step 8: Create Application Load Balancer

Go to **EC2 → Load Balancers → Create → Application Load Balancer**

| Setting            | Value                                  |
| ------------------ | -------------------------------------- |
| Name               | `chatbot-alb`                          |
| Scheme             | Internet-facing                        |
| IP address type    | IPv4                                   |
| VPC                | Your VPC                               |
| Availability Zones | Select **at least 2** subnets (public) |
| Security Group     | `chatbot-alb-sg`                       |
| Listener           | HTTP : 80                              |
| Default action     | Forward to `chatbot-frontend-tg`       |

### 8.1 Add Path-Based Routing Rule

After ALB is created:

1. Go to **ALB → Listeners → HTTP:80 → View/edit rules**
2. Click **Add Rule**:
   - **Name**: `api-routing`
   - **Condition**: Path pattern = `/api/*`
   - **Action**: Forward to `chatbot-backend-tg`
   - **Priority**: 1
3. **Default rule** remains: Forward to `chatbot-frontend-tg`

### 8.2 Configure ALB Idle Timeout (Important for SSE!)

1. Go to **ALB → Attributes → Edit**
2. Set **Idle timeout** to `300` seconds (default is 60s, too short for streaming)

---

## Step 9: Register ECS Task Definitions

### 9.1 Backend Task Definition

> Before registering, update `CLIENT_URL` in `aws/backend-task-definition.json` with your ALB DNS.

```bash
# Get your ALB DNS after creation
aws elbv2 describe-load-balancers --names chatbot-alb --query "LoadBalancers[0].DNSName" --output text --region ap-south-1
```

Edit `aws/backend-task-definition.json` and set:

```json
{ "name": "CLIENT_URL", "value": "http://YOUR-ALB-DNS-HERE" }
```

Then register:

```bash
aws ecs register-task-definition --cli-input-json file://aws/backend-task-definition.json --region ap-south-1
```

### 9.2 Frontend Task Definition

```bash
aws ecs register-task-definition --cli-input-json file://aws/frontend-task-definition.json --region ap-south-1
```

---

## Step 10: Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name chatbot-cluster --region ap-south-1
```

Or via console: **ECS → Clusters → Create Cluster**

| Setting        | Value             |
| -------------- | ----------------- |
| Cluster name   | `chatbot-cluster` |
| Infrastructure | AWS Fargate       |

---

## Step 11: Create ECS Services

### 11.1 Backend Service

Go to **ECS → chatbot-cluster → Create Service**

| Setting               | Value                                 |
| --------------------- | ------------------------------------- |
| Launch type           | FARGATE                               |
| Task definition       | `chatbot-backend` (latest revision)   |
| Service name          | `chatbot-backend-svc`                 |
| Desired tasks         | 1                                     |
| VPC                   | Your VPC                              |
| Subnets               | Private subnets (or public if no NAT) |
| Security group        | `chatbot-backend-sg`                  |
| Auto-assign public IP | ENABLED (if using public subnets)     |
| Load balancer type    | Application Load Balancer             |
| Load balancer         | `chatbot-alb`                         |
| Target group          | `chatbot-backend-tg`                  |
| Container name        | `chatbot-backend`                     |
| Container port        | `8000`                                |

**CLI alternative:**

```bash
aws ecs create-service \
  --cluster chatbot-cluster \
  --service-name chatbot-backend-svc \
  --task-definition chatbot-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXXX,subnet-YYYYY],securityGroups=[sg-BACKEND],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:767903311473:targetgroup/chatbot-backend-tg/XXXXX,containerName=chatbot-backend,containerPort=8000" \
  --region ap-south-1
```

### 11.2 Frontend Service

Go to **ECS → chatbot-cluster → Create Service**

| Setting               | Value                                 |
| --------------------- | ------------------------------------- |
| Launch type           | FARGATE                               |
| Task definition       | `chatbot-frontend` (latest revision)  |
| Service name          | `chatbot-frontend-svc`                |
| Desired tasks         | 1                                     |
| VPC                   | Your VPC                              |
| Subnets               | Private subnets (or public if no NAT) |
| Security group        | `chatbot-frontend-sg`                 |
| Auto-assign public IP | ENABLED (if using public subnets)     |
| Load balancer type    | Application Load Balancer             |
| Load balancer         | `chatbot-alb`                         |
| Target group          | `chatbot-frontend-tg`                 |
| Container name        | `chatbot-frontend`                    |
| Container port        | `80`                                  |

---

## Step 12: Verify Deployment

### 12.1 Get ALB DNS

```bash
aws elbv2 describe-load-balancers --names chatbot-alb --query "LoadBalancers[0].DNSName" --output text --region ap-south-1
```

### 12.2 Test Endpoints

```bash
# Frontend (should return HTML)
curl http://YOUR-ALB-DNS/

# Backend health check
curl http://YOUR-ALB-DNS/api/health
# Expected: {"status":"ok"}

# Test auth route
curl -X POST http://YOUR-ALB-DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Test SSE stream (should NOT return 405)
curl -X POST http://YOUR-ALB-DNS/api/chat/conversations/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content":"Hello"}' \
  -N
```

---

## Step 13: (Optional) Add HTTPS with ACM

### 13.1 Request SSL Certificate

1. Go to **ACM (Certificate Manager) → Request Certificate**
2. Enter your domain: `chat.yourdomain.com`
3. Validate via DNS (add CNAME to Route 53)

### 13.2 Add HTTPS Listener to ALB

1. Go to **ALB → Listeners → Add Listener**
2. Protocol: HTTPS, Port: 443
3. SSL Certificate: Select your ACM certificate
4. Default action: Forward to `chatbot-frontend-tg`
5. Add the same `/api/*` rule forwarding to `chatbot-backend-tg`

### 13.3 Redirect HTTP to HTTPS

1. Edit HTTP:80 listener
2. Change default action to: **Redirect to HTTPS:443**

### 13.4 Update CLIENT_URL

Update backend task definition `CLIENT_URL` to `https://chat.yourdomain.com`

---

## Troubleshooting

### SSE Stream returns 405 (Not Allowed)

- **Cause**: Request is hitting nginx instead of the backend
- **Fix**: Ensure ALB rule `/api/*` has higher priority than default rule
- **Fix**: Ensure `VITE_BASE_URL=/api` (relative, NOT absolute URL)

### SSE Stream times out

- **Fix**: Increase ALB idle timeout to 300s (Step 8.2)
- **Fix**: Increase backend target group deregistration delay to 300s

### CORS Errors

- **Cause**: Frontend is calling an absolute backend URL instead of relative
- **Fix**: Rebuild frontend with `VITE_BASE_URL=/api`

### 502 Bad Gateway

- **Cause**: Backend container is not healthy
- **Check**: ECS → Service → Tasks → Logs
- **Check**: Target group health checks (backend must respond 200 on `/api/health`)

### 503 Service Unavailable

- **Cause**: No healthy targets in the target group
- **Check**: Security group allows ALB → container traffic on correct port
- **Check**: Container is running (`aws ecs describe-services`)

### Cookie / Auth Issues

- Ensure `CLIENT_URL` in backend matches the ALB DNS or your domain
- Ensure `credentials: 'include'` in frontend fetch calls
- Same-origin policy: both frontend and API must be on the same domain

---

## Traffic Flow Diagram

```
Browser:  POST /api/chat/conversations/stream
    │
    ▼
ALB (chatbot-alb)
    │
    ├── Rule: /api/*  ──► Backend Target Group (port 8000)
    │                         │
    │                         ▼
    │                    ECS Backend Container
    │                    Express handles: /api/chat/conversations/stream
    │                    Returns: SSE text/event-stream ✅
    │
    └── Default: /*   ──► Frontend Target Group (port 80)
                             │
                             ▼
                        ECS Frontend Container
                        nginx serves: index.html (SPA)
```

---

## Quick Reference — Key Values

| Item                    | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| AWS Region              | `ap-south-1`                                                     |
| ECR Backend             | `767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-backend`  |
| ECR Frontend            | `767903311473.dkr.ecr.ap-south-1.amazonaws.com/chatbot-frontend` |
| Backend Port            | `8000`                                                           |
| Frontend Port           | `80`                                                             |
| `VITE_BASE_URL`         | `/api`                                                           |
| `CLIENT_URL`            | `http://YOUR-ALB-DNS`                                            |
| ALB Idle Timeout        | `300s`                                                           |
| Health Check (backend)  | `/api/health`                                                    |
| Health Check (frontend) | `/`                                                              |
