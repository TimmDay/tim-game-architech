import type { ComponentKind } from "~/sim/types"

export type Provider = "generic" | "aws" | "azure" | "gcp"

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "aws", label: "AWS" },
  { id: "azure", label: "Azure" },
  { id: "gcp", label: "GCP" },
  { id: "generic", label: "None" },
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
}

export const serviceName = (kind: ComponentKind, provider: Provider) =>
  SERVICE_NAMES[kind][provider]

/** The client node is the same everywhere: your users are not a product. */
export const CLIENT_NAME: ServiceName = { name: "Users", short: "Users" }
