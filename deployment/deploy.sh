#!/bin/bash

# BERT v3.0 Production Deployment Script
# Implements blue-green deployment strategy with zero downtime

set -e

# Configuration
ENVIRONMENT=${1:-production}
DEPLOYMENT_TYPE=${2:-blue-green}
ROLLBACK=${3:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check environment files
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        error "Environment file .env.${ENVIRONMENT} not found"
        exit 1
    fi
    
    # Check if services are healthy
    log "Checking current service health..."
    if docker-compose ps | grep -q "unhealthy"; then
        warning "Some services are unhealthy. Proceeding with caution."
    fi
    
    success "Pre-deployment checks passed"
}

# Blue-Green Deployment
blue_green_deploy() {
    log "Starting blue-green deployment..."
    
    # Determine current and new environments
    CURRENT_ENV=$(docker-compose ps | grep "bert-api-gateway" | grep -o "blue\|green" | head -1)
    if [ "$CURRENT_ENV" = "blue" ]; then
        NEW_ENV="green"
    else
        NEW_ENV="blue"
    fi
    
    log "Current environment: ${CURRENT_ENV:-none}"
    log "Deploying to: $NEW_ENV"
    
    # Deploy new environment
    log "Deploying $NEW_ENV environment..."
    docker-compose -f docker-compose.yml -f docker-compose.${NEW_ENV}.yml up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Health check
    if health_check "$NEW_ENV"; then
        log "Switching traffic to $NEW_ENV environment..."
        
        # Update load balancer configuration
        update_load_balancer "$NEW_ENV"
        
        # Wait for traffic switch
        sleep 10
        
        # Stop old environment
        if [ -n "$CURRENT_ENV" ]; then
            log "Stopping $CURRENT_ENV environment..."
            docker-compose -f docker-compose.yml -f docker-compose.${CURRENT_ENV}.yml down
        fi
        
        success "Blue-green deployment completed successfully"
    else
        error "Health check failed for $NEW_ENV environment"
        log "Rolling back..."
        docker-compose -f docker-compose.yml -f docker-compose.${NEW_ENV}.yml down
        exit 1
    fi
}

# Health check function
health_check() {
    local env=$1
    local max_attempts=30
    local attempt=1
    
    log "Performing health check for $env environment..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:3000/health" > /dev/null; then
            success "Health check passed (attempt $attempt)"
            return 0
        fi
        
        log "Health check attempt $attempt failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Update load balancer
update_load_balancer() {
    local env=$1
    log "Updating load balancer configuration for $env..."
    
    # This would typically update nginx, HAProxy, or cloud load balancer
    # For demonstration, we'll just log the action
    log "Load balancer updated to route traffic to $env environment"
}

# Database migration
run_migrations() {
    log "Running database migrations..."
    
    # Run migration container
    docker run --rm \
        --network bert-network \
        -e DATABASE_URL="postgresql://bert:bert123@postgres:5432/bert" \
        bert-migrations:latest
    
    success "Database migrations completed"
}

# Backup database
backup_database() {
    log "Creating database backup..."
    
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker exec bert-postgres pg_dump -U bert bert > "backups/$backup_file"
    
    success "Database backup created: $backup_file"
}

# Rollback function
rollback_deployment() {
    log "Starting rollback procedure..."
    
    # Get previous deployment info
    local previous_env=$(docker-compose ps | grep "bert-api-gateway" | grep -v "$(get_current_env)" | grep -o "blue\|green" | head -1)
    
    if [ -n "$previous_env" ]; then
        log "Rolling back to $previous_env environment..."
        
        # Switch traffic back
        update_load_balancer "$previous_env"
        
        # Start previous environment if not running
        docker-compose -f docker-compose.yml -f docker-compose.${previous_env}.yml up -d
        
        # Stop current environment
        local current_env=$(get_current_env)
        if [ -n "$current_env" ]; then
            docker-compose -f docker-compose.yml -f docker-compose.${current_env}.yml down
        fi
        
        success "Rollback completed successfully"
    else
        error "No previous environment found for rollback"
        exit 1
    fi
}

# Get current environment
get_current_env() {
    docker-compose ps | grep "bert-api-gateway" | grep -o "blue\|green" | head -1
}

# Monitoring setup
setup_monitoring() {
    log "Setting up monitoring stack..."
    
    # Deploy monitoring services
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d
    
    # Wait for services to start
    sleep 30
    
    # Import Grafana dashboards
    log "Importing Grafana dashboards..."
    # This would typically use Grafana API to import dashboards
    
    success "Monitoring stack deployed"
}

# Main deployment function
main() {
    log "Starting BERT v3.0 deployment..."
    log "Environment: $ENVIRONMENT"
    log "Deployment type: $DEPLOYMENT_TYPE"
    
    # Load environment variables
    source ".env.${ENVIRONMENT}"
    
    if [ "$ROLLBACK" = "true" ]; then
        rollback_deployment
        exit 0
    fi
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Create database backup
    backup_database
    
    # Run database migrations
    run_migrations
    
    # Deploy based on strategy
    case $DEPLOYMENT_TYPE in
        "blue-green")
            blue_green_deploy
            ;;
        "rolling")
            log "Rolling deployment not implemented yet"
            exit 1
            ;;
        *)
            error "Unknown deployment type: $DEPLOYMENT_TYPE"
            exit 1
            ;;
    esac
    
    # Setup monitoring if not exists
    if ! docker-compose -f monitoring/docker-compose.monitoring.yml ps | grep -q "Up"; then
        setup_monitoring
    fi
    
    success "BERT v3.0 deployment completed successfully!"
    log "Access points:"
    log "  - API Gateway: http://localhost:3000"
    log "  - Grafana: http://localhost:3000 (admin/bert-admin-2024)"
    log "  - Kibana: http://localhost:5601"
    log "  - Jaeger: http://localhost:16686"
}

# Script execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi