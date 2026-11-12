# ============================================================
# iPhone Duo compare lab - one-click GitHub uploader (API, no git)
#
# Usage: cd D:\HFL\study\iphone-duo-compare
#        .\upload-to-github.ps1
#
# Token permissions:
#   Contents: Read and write
#   Administration: Read and write
#   Workflows: Read and write
# ============================================================
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoName = 'iphone-duo-compare'
$repoDesc = 'iPhone Duo interactive 3D teardown comparison'

# ---------- 1) Credentials ----------
$answer = Read-Host "GitHub username [hflboy]"
$user = if ($answer) { $answer.Trim() } else { 'hflboy' }

if ($env:GITHUB_TOKEN) {
  $token = $env:GITHUB_TOKEN
} else {
  $sec = Read-Host "Personal Access Token (hidden)" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try {
    $token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$h = @{
  Authorization = "Bearer $token"
  Accept = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

# ---------- 2) Validate token ----------
try {
  $me = Invoke-RestMethod 'https://api.github.com/user' -Headers $h
  Write-Host "[OK] Authenticated as $($me.login)"
} catch {
  Write-Host "[ERROR] Invalid token or network failure: $($_.Exception.Message)"
  return
}

# ---------- 3) Ensure repository exists ----------
try {
  Invoke-RestMethod "https://api.github.com/repos/$user/$repoName" -Headers $h | Out-Null
  Write-Host "[OK] Repository found, syncing files."
} catch {
  $body = @{
    name = $repoName
    description = $repoDesc
    private = $false
    auto_init = $false
  } | ConvertTo-Json
  try {
    Invoke-RestMethod 'https://api.github.com/user/repos' -Headers $h -Method Post -Body $body -ContentType 'application/json' | Out-Null
    Write-Host "[OK] Repository created."
  } catch {
    Write-Host "[ERROR] Could not create repository: $($_.Exception.Message)"
    return
  }
}
$base = "https://api.github.com/repos/$user/$repoName"

# ---------- 4) Build upload list ----------
$jobs = New-Object System.Collections.Generic.List[object]
$skip = '\\.git\\|\\node_modules\\|\\js\\lib\\|\\package-lock\.json$'

foreach ($file in @('README.md', 'PROMPT.md', 'index.html', 'package.json', '.gitignore', 'upload-to-github.ps1')) {
  $path = Join-Path $root $file
  if (Test-Path $path) {
    $jobs.Add(@{ local = $path; remote = $file })
  }
}

foreach ($dirName in @('tools', 'docs', '.github', 'models')) {
  $dir = Join-Path $root $dirName
  if (-not (Test-Path $dir)) { continue }
  Get-ChildItem $dir -Recurse -File -Force |
    Where-Object { $_.FullName -notmatch $skip } |
    ForEach-Object {
      $relative = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
      $jobs.Add(@{ local = $_.FullName; remote = $relative })
    }
}

Write-Host "[INFO] $($jobs.Count) files to sync."

# ---------- 5) Upload files ----------
$failed = 0
foreach ($job in $jobs) {
  $relative = $job.remote
  $encoded = [uri]::EscapeDataString($relative).Replace('%2F', '/')
  $sha = $null
  try {
    $sha = (Invoke-RestMethod "$base/contents/$encoded" -Headers $h).sha
  } catch {}

  $payload = @{
    message = "sync: $relative"
    content = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($job.local))
    branch = 'main'
  }
  if ($sha) { $payload.sha = $sha }

  try {
    Invoke-RestMethod "$base/contents/$encoded" -Headers $h -Method Put -Body ($payload | ConvertTo-Json) -ContentType 'application/json' | Out-Null
    Write-Host "  [OK] $relative"
  } catch {
    $failed++
    Write-Host "  [FAIL] $relative :: $($_.Exception.Message)"
  }
}

if ($failed -gt 0) {
  Write-Host "[WARN] Sync finished with $failed failed file(s)."
} else {
  Write-Host "[DONE] https://github.com/$user/$repoName"
}
Write-Host "[SECURITY] Revoke the token used for this upload when finished."
