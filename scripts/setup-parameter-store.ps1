# ============================================
# VidyaMitra - AWS Parameter Store Setup Script
# ============================================
# This script uploads your permanent API keys to AWS Parameter Store
# AWS credentials stay in local .env (they expire every 4 hours)
#
# USAGE: 
#   1. Make sure your AWS credentials are fresh in .env
#   2. Run: .\scripts\setup-parameter-store.ps1
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  VidyaMitra Parameter Store Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not installed. Please install it first." -ForegroundColor Red
    Write-Host "  Download: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Read .env file
$envPath = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "✗ .env file not found at: $envPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Reading .env file..." -ForegroundColor Green
$envContent = Get-Content $envPath -Raw

# Function to get env value
function Get-EnvValue {
    param([string]$key)
    if ($envContent -match "(?m)^$key=(.+)$") {
        return $matches[1].Trim()
    }
    return $null
}

# Set AWS credentials from .env for this session
$env:AWS_ACCESS_KEY_ID = Get-EnvValue "AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = Get-EnvValue "AWS_SECRET_ACCESS_KEY"
$env:AWS_SESSION_TOKEN = Get-EnvValue "AWS_SESSION_TOKEN"
$env:AWS_REGION = Get-EnvValue "AWS_REGION"

if (-not $env:AWS_ACCESS_KEY_ID) {
    Write-Host "✗ AWS credentials not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "✓ AWS credentials loaded from .env" -ForegroundColor Green

# Test AWS connection
Write-Host "`nTesting AWS connection..." -ForegroundColor Yellow
try {
    aws sts get-caller-identity --output json 2>&1 | Out-Null
    Write-Host "✓ AWS connection successful!`n" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS connection failed. Your credentials may have expired." -ForegroundColor Red
    Write-Host "  Please update AWS credentials in .env from Learner Lab" -ForegroundColor Yellow
    exit 1
}

# Define parameters to create (PERMANENT values only - not AWS credentials)
$parameters = @(
    # === API KEYS ===
    @{ Name = "/vidyamitra/api-keys/VITE_GEMINI_API_KEY"; Key = "VITE_GEMINI_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/VITE_GEMINI_CHATBOT_API_KEY"; Key = "VITE_GEMINI_CHATBOT_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/VITE_GEMINI_FRIEDE_API_KEY"; Key = "VITE_GEMINI_FRIEDE_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/GEMINI_API_KEY"; Key = "GEMINI_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/GEMINI_IMAGE_API_KEY"; Key = "GEMINI_IMAGE_API_KEY"; Type = "SecureString" },
    
    @{ Name = "/vidyamitra/api-keys/OPENAI_API_KEY"; Key = "OPENAI_API_KEY"; Type = "SecureString" },
    
    @{ Name = "/vidyamitra/api-keys/GROQ_API_KEY"; Key = "GROQ_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/VITE_GROQ_API_KEY"; Key = "VITE_GROQ_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/GROQ_GAP_ANALYSIS_KEY"; Key = "GROQ_GAP_ANALYSIS_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/GROQ_API_KEY_2"; Key = "GROQ_API_KEY_2"; Type = "SecureString" },
    
    @{ Name = "/vidyamitra/api-keys/ELEVENLABS_API_KEY"; Key = "ELEVENLABS_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/VITE_ELEVENLABS_AGENT_ID"; Key = "VITE_ELEVENLABS_AGENT_ID"; Type = "String" },
    
    @{ Name = "/vidyamitra/api-keys/YOUTUBE_API_KEY"; Key = "YOUTUBE_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/PEXELS_API_KEY"; Key = "PEXELS_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/NEWS_API_KEY"; Key = "NEWS_API_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/EXCHANGE_RATE_API_KEY"; Key = "EXCHANGE_RATE_API_KEY"; Type = "SecureString" },
    
    @{ Name = "/vidyamitra/api-keys/VITE_GITHUB_API_KEY"; Key = "VITE_GITHUB_API_KEY"; Type = "SecureString" },
    
    @{ Name = "/vidyamitra/api-keys/JUDGE0_RAPIDAPI_KEY"; Key = "JUDGE0_RAPIDAPI_KEY"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/JUDGE0_RAPIDAPI_HOST"; Key = "JUDGE0_RAPIDAPI_HOST"; Type = "String" },
    @{ Name = "/vidyamitra/api-keys/JUDGE0_RAPIDAPI_URL"; Key = "JUDGE0_RAPIDAPI_URL"; Type = "String" },
    @{ Name = "/vidyamitra/api-keys/JUDGE0_HOST"; Key = "JUDGE0_HOST"; Type = "String" },
    
    @{ Name = "/vidyamitra/api-keys/RAZORPAY_KEY_ID"; Key = "RAZORPAY_KEY_ID"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/RAZORPAY_KEY_SECRET"; Key = "RAZORPAY_KEY_SECRET"; Type = "SecureString" },
    @{ Name = "/vidyamitra/api-keys/VITE_RAZORPAY_KEY_ID"; Key = "VITE_RAZORPAY_KEY_ID"; Type = "SecureString" },
    
    # === DATABASE ===
    @{ Name = "/vidyamitra/database/SUPABASE_URL"; Key = "SUPABASE_URL"; Type = "String" },
    @{ Name = "/vidyamitra/database/SUPABASE_SERVICE_ROLE_KEY"; Key = "SUPABASE_SERVICE_ROLE_KEY"; Type = "SecureString" },
    
    # === AWS CONFIG (Permanent parts only) ===
    @{ Name = "/vidyamitra/aws/S3_BUCKET_NAME"; Key = "S3_BUCKET_NAME"; Type = "String" },
    @{ Name = "/vidyamitra/aws/AWS_REGION"; Key = "AWS_REGION"; Type = "String" },
    @{ Name = "/vidyamitra/aws/AWS_LAMBDA_RESUME_API"; Key = "AWS_LAMBDA_RESUME_API"; Type = "String" },
    
    # === APP CONFIG ===
    @{ Name = "/vidyamitra/config/DB_TYPE"; Key = "DB_TYPE"; Type = "String" },
    @{ Name = "/vidyamitra/config/VITE_MAX_CODE_LENGTH"; Key = "VITE_MAX_CODE_LENGTH"; Type = "String" },
    @{ Name = "/vidyamitra/config/VITE_MAX_EXECUTION_TIME"; Key = "VITE_MAX_EXECUTION_TIME"; Type = "String" },
    @{ Name = "/vidyamitra/config/VITE_ENABLE_CODE_SANITIZATION"; Key = "VITE_ENABLE_CODE_SANITIZATION"; Type = "String" }
)

Write-Host "Creating parameters in AWS Parameter Store...`n" -ForegroundColor Yellow

$successCount = 0
$skipCount = 0
$failCount = 0

foreach ($param in $parameters) {
    $value = Get-EnvValue $param.Key
    
    if (-not $value) {
        Write-Host "  ⊘ SKIP: $($param.Key) (not found in .env)" -ForegroundColor DarkGray
        $skipCount++
        continue
    }
    
    try {
        $result = aws ssm put-parameter `
            --name $param.Name `
            --value $value `
            --type $param.Type `
            --overwrite `
            --region $env:AWS_REGION 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $($param.Name)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ✗ $($param.Name): $result" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "  ✗ $($param.Name): $_" -ForegroundColor Red
        $failCount++
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Created/Updated: $successCount" -ForegroundColor Green
Write-Host "  Skipped:         $skipCount" -ForegroundColor DarkGray
Write-Host "  Failed:          $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

if ($successCount -gt 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  NEXT STEPS" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host @"

  1. Edit your .env file:
     Change: USE_AWS_SECRETS_MANAGER=false
     To:     USE_AWS_SECRETS_MANAGER=true

  2. Keep these in .env (they expire every 4 hours):
     - AWS_ACCESS_KEY_ID
     - AWS_SECRET_ACCESS_KEY
     - AWS_SESSION_TOKEN

  3. You can now REMOVE these API keys from .env
     (optional - the app will load them from Parameter Store)

  4. Test the app:
     npm run dev

"@ -ForegroundColor White
}

Write-Host "`nDone!`n" -ForegroundColor Cyan
