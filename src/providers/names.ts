import type { ComponentKind } from "~/sim/types"

export type Provider = "generic" | "aws" | "azure" | "gcp"

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "aws", label: "AWS" },
  { id: "azure", label: "Azure" },
  { id: "gcp", label: "GCP" },
  { id: "generic", label: "Prem" },
]

export type ServiceName = {
  /** The product's full name, as the provider's own docs write it. */
  name: string
  /** Fits under a block on the canvas. */
  short: string
}

/**
 * Every component's name under every provider. A `Record` of `Record`s, so
 * adding a ComponentKind without naming it everywhere is a compile error.
 *
 * "generic" is the vendor-neutral, textbook name: what you'd say on a
 * whiteboard in an interview before anyone has picked a cloud.
 *
 * Checked October 2026. Names that have moved recently: Azure Cache for Redis
 * is being retired in favour of Azure Managed Redis; Azure CDN (classic) in
 * favour of Front Door; Google Cloud Functions is now Cloud Run functions; new
 * Azure warehouses go on Microsoft Fabric rather than Synapse.
 */
export const SERVICE_NAMES: Record<
  ComponentKind,
  Record<Provider, ServiceName>
> = {
  dns: {
    generic: { name: "DNS", short: "DNS" },
    aws: { name: "Amazon Route 53", short: "Route 53" },
    azure: { name: "Azure DNS", short: "Azure DNS" },
    gcp: { name: "Cloud DNS", short: "Cloud DNS" },
  },
  cdn: {
    generic: { name: "Content Delivery Network", short: "CDN" },
    aws: { name: "Amazon CloudFront", short: "CloudFront" },
    azure: { name: "Azure Front Door", short: "Front Door" },
    gcp: { name: "Cloud CDN", short: "Cloud CDN" },
  },
  "load-balancer": {
    generic: { name: "Layer 7 Load Balancer", short: "Load Balancer" },
    aws: { name: "Application Load Balancer", short: "ALB" },
    azure: { name: "Azure Application Gateway", short: "App Gateway" },
    gcp: { name: "Cloud Load Balancing", short: "Cloud LB" },
  },
  "api-gateway": {
    generic: { name: "API Gateway", short: "API Gateway" },
    aws: { name: "Amazon API Gateway", short: "API Gateway" },
    azure: { name: "Azure API Management", short: "API Mgmt" },
    gcp: { name: "Apigee API Management", short: "Apigee" },
  },
  "app-server": {
    generic: { name: "Stateless Application Server", short: "App Server" },
    aws: { name: "Amazon ECS on AWS Fargate", short: "ECS Fargate" },
    azure: { name: "Azure Container Apps", short: "Container Apps" },
    gcp: { name: "Cloud Run", short: "Cloud Run" },
  },
  serverless: {
    generic: { name: "Function as a Service", short: "Functions" },
    aws: { name: "AWS Lambda", short: "Lambda" },
    azure: { name: "Azure Functions", short: "Functions" },
    gcp: { name: "Cloud Run functions", short: "Run functions" },
  },
  cache: {
    generic: { name: "In-Memory Key-Value Cache", short: "Cache" },
    aws: { name: "Amazon ElastiCache", short: "ElastiCache" },
    azure: { name: "Azure Managed Redis", short: "Managed Redis" },
    gcp: { name: "Memorystore", short: "Memorystore" },
  },
  "sql-primary": {
    generic: { name: "Relational Database (Primary)", short: "SQL Primary" },
    aws: { name: "Amazon RDS for PostgreSQL", short: "RDS Primary" },
    azure: {
      name: "Azure Database for PostgreSQL",
      short: "Azure PG Primary",
    },
    gcp: { name: "Cloud SQL for PostgreSQL", short: "Cloud SQL Primary" },
  },
  "sql-replica": {
    generic: {
      name: "Relational Database (Read Replica)",
      short: "Read Replica",
    },
    aws: { name: "Amazon RDS Read Replica", short: "RDS Replica" },
    azure: {
      name: "Azure Database for PostgreSQL Read Replica",
      short: "Azure PG Replica",
    },
    gcp: { name: "Cloud SQL Read Replica", short: "Cloud SQL Replica" },
  },
  nosql: {
    generic: {
      name: "Distributed Key-Value / Document Store",
      short: "NoSQL Store",
    },
    aws: { name: "Amazon DynamoDB", short: "DynamoDB" },
    azure: { name: "Azure Cosmos DB", short: "Cosmos DB" },
    gcp: { name: "Firestore", short: "Firestore" },
  },
  queue: {
    generic: { name: "Message Queue", short: "Queue" },
    aws: { name: "Amazon SQS", short: "SQS" },
    azure: { name: "Azure Service Bus", short: "Service Bus" },
    gcp: { name: "Cloud Tasks", short: "Cloud Tasks" },
  },
  "event-stream": {
    generic: { name: "Event Log (Publish / Subscribe)", short: "Event Stream" },
    aws: { name: "Amazon Kinesis Data Streams", short: "Kinesis" },
    azure: { name: "Azure Event Hubs", short: "Event Hubs" },
    gcp: { name: "Pub/Sub", short: "Pub/Sub" },
  },
  worker: {
    generic: { name: "Background Worker Pool", short: "Workers" },
    aws: { name: "Amazon ECS Worker Service", short: "ECS Workers" },
    azure: { name: "Azure Container Apps Jobs", short: "Container Jobs" },
    gcp: { name: "Cloud Run Worker Pools", short: "Worker Pools" },
  },
  "object-store": {
    generic: { name: "Object Storage", short: "Object Store" },
    aws: { name: "Amazon S3", short: "S3" },
    azure: { name: "Azure Blob Storage", short: "Blob Storage" },
    gcp: { name: "Cloud Storage", short: "Cloud Storage" },
  },
  "search-index": {
    generic: { name: "Full-Text Search Index", short: "Search Index" },
    aws: { name: "Amazon OpenSearch Service", short: "OpenSearch" },
    azure: { name: "Azure AI Search", short: "AI Search" },
    gcp: { name: "Vertex AI Search", short: "Vertex Search" },
  },
  "doc-ai": {
    generic: { name: "Document OCR Service", short: "Document OCR" },
    aws: { name: "Amazon Textract", short: "Textract" },
    azure: {
      name: "Azure AI Document Intelligence",
      short: "Doc Intelligence",
    },
    gcp: { name: "Document AI", short: "Document AI" },
  },
  // Not a cloud product: it's someone else's API, whichever cloud you're on.
  "third-party-api": {
    generic: { name: "Third-party API", short: "Partner API" },
    aws: { name: "Third-party API", short: "Partner API" },
    azure: { name: "Third-party API", short: "Partner API" },
    gcp: { name: "Third-party API", short: "Partner API" },
  },
  "data-warehouse": {
    generic: { name: "Columnar Data Warehouse (OLAP)", short: "Warehouse" },
    aws: { name: "Amazon Redshift", short: "Redshift" },
    azure: { name: "Microsoft Fabric Data Warehouse", short: "Fabric DW" },
    gcp: { name: "BigQuery", short: "BigQuery" },
  },
  // Checked October 2026. GCP has no managed WebSocket gateway: its docs
  // point to WebSockets on Cloud Run.
  "realtime-gateway": {
    generic: { name: "WebSocket Gateway", short: "WebSockets" },
    aws: { name: "Amazon API Gateway WebSocket APIs", short: "WebSocket API" },
    azure: { name: "Azure Web PubSub", short: "Web PubSub" },
    gcp: { name: "Cloud Run WebSockets", short: "Run WebSockets" },
  },
  pubsub: {
    generic: { name: "Pub/Sub Topic", short: "Topic" },
    aws: { name: "Amazon SNS", short: "SNS" },
    azure: { name: "Azure Event Grid", short: "Event Grid" },
    gcp: { name: "Pub/Sub topic", short: "Pub/Sub topic" },
  },
  "push-service": {
    generic: { name: "Push Notification Service", short: "Push" },
    aws: { name: "Amazon SNS Mobile Push", short: "SNS Push" },
    azure: { name: "Azure Notification Hubs", short: "Notif. Hubs" },
    gcp: { name: "Firebase Cloud Messaging", short: "FCM" },
  },
  "stream-processor": {
    generic: { name: "Stream Processor", short: "Stream Proc." },
    aws: {
      name: "Amazon Managed Service for Apache Flink",
      short: "Managed Flink",
    },
    azure: { name: "Azure Stream Analytics", short: "Stream Analytics" },
    gcp: { name: "Dataflow", short: "Dataflow" },
  },
  // Azure has no standalone scheduler since Azure Scheduler retired: a Logic
  // Apps recurrence trigger is the usual answer.
  scheduler: {
    generic: { name: "Job Scheduler", short: "Scheduler" },
    aws: { name: "Amazon EventBridge Scheduler", short: "EB Scheduler" },
    azure: { name: "Azure Logic Apps", short: "Logic Apps" },
    gcp: { name: "Cloud Scheduler", short: "Cloud Scheduler" },
  },
  // Timestream for LiveAnalytics closed to new customers in June 2025; AWS
  // points new ones to Timestream for InfluxDB.
  "time-series-db": {
    generic: { name: "Time-Series Database", short: "Time-Series DB" },
    aws: { name: "Amazon Timestream for InfluxDB", short: "Timestream" },
    azure: { name: "Azure Data Explorer", short: "Data Explorer" },
    gcp: { name: "Bigtable", short: "Bigtable" },
  },
  // Not a managed product on any of the three: you run etcd or ZooKeeper.
  coordination: {
    generic: { name: "Coordination Service", short: "Coordinator" },
    aws: { name: "Coordination Service", short: "Coordinator" },
    azure: { name: "Coordination Service", short: "Coordinator" },
    gcp: { name: "Coordination Service", short: "Coordinator" },
  },
  "graph-db": {
    generic: { name: "Graph Database", short: "Graph DB" },
    aws: { name: "Amazon Neptune", short: "Neptune" },
    azure: {
      name: "Azure Cosmos DB for Apache Gremlin",
      short: "Cosmos Gremlin",
    },
    gcp: { name: "Spanner Graph", short: "Spanner Graph" },
  },
  "vector-db": {
    generic: { name: "Vector Database", short: "Vector DB" },
    aws: { name: "Amazon S3 Vectors", short: "S3 Vectors" },
    azure: { name: "Azure Cosmos DB vector search", short: "Cosmos Vectors" },
    gcp: { name: "Vertex AI Vector Search", short: "Vector Search" },
  },
  "rate-limiter": {
    generic: { name: "Rate Limiter", short: "Rate Limiter" },
    aws: { name: "AWS WAF", short: "WAF" },
    azure: { name: "Azure Web Application Firewall", short: "Azure WAF" },
    gcp: { name: "Google Cloud Armor", short: "Cloud Armor" },
  },
  // Azure AD B2C closed to new customers in May 2025; Entra External ID
  // replaces it.
  "auth-service": {
    generic: { name: "Identity Provider", short: "Auth" },
    aws: { name: "Amazon Cognito", short: "Cognito" },
    azure: { name: "Microsoft Entra External ID", short: "Entra ID" },
    gcp: { name: "Identity Platform", short: "Identity Platform" },
  },
  // Vertex AI became Gemini Enterprise Agent Platform in April 2026; Azure
  // OpenAI now sits inside Microsoft Foundry Models.
  "llm-api": {
    generic: { name: "Model API", short: "Model API" },
    aws: { name: "Amazon Bedrock", short: "Bedrock" },
    azure: { name: "Azure OpenAI in Foundry Models", short: "Azure OpenAI" },
    gcp: { name: "Gemini Enterprise Agent Platform", short: "Agent Platform" },
  },
  "llm-batch": {
    generic: { name: "Batch Model API", short: "Model Batch" },
    aws: { name: "Amazon Bedrock batch inference", short: "Bedrock Batch" },
    azure: { name: "Azure OpenAI Batch", short: "OpenAI Batch" },
    gcp: {
      name: "Gemini Enterprise Agent Platform batch",
      short: "Agent Batch",
    },
  },
}

export const serviceName = (kind: ComponentKind, provider: Provider) =>
  SERVICE_NAMES[kind][provider]

/** The client node is the same everywhere: your users are not a product. */
export const CLIENT_NAME: ServiceName = { name: "Users", short: "Users" }
