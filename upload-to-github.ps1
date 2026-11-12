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

foreach ($dirName in @('tools', 'docs', '.github', 'models', 'vendor')) {
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

# ---------- 5) Create blobs, then commit once ----------
$headSha = $null
$baseTree = $null
try {
  $ref = Invoke-RestMethod "$base/git/ref/heads/main" -Headers $h
  $headSha = $ref.object.sha
  $headCommit = Invoke-RestMethod "$base/git/commits/$headSha" -Headers $h
  $baseTree = $headCommit.tree.sha
} catch {
  Write-Host "[INFO] main does not exist yet; creating the initial commit."
}

$treeItems = New-Object System.Collections.Generic.List[object]
foreach ($job in $jobs) {
  $blobBody = @{
    content = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($job.local))
    encoding = 'base64'
  } | ConvertTo-Json
  try {
    $blob = Invoke-RestMethod "$base/git/blobs" -Headers $h -Method Post -Body $blobBody -ContentType 'application/json'
    $treeItems.Add(@{
      path = $job.remote
      mode = '100644'
      type = 'blob'
      sha = $blob.sha
    })
    Write-Host "  [OK] blob $($job.remote)"
  } catch {
    Write-Host "[ERROR] Blob upload failed: $($job.remote) :: $($_.Exception.Message)"
    return
  }
}

$treeBody = @{ tree = $treeItems }
if ($baseTree) { $treeBody.base_tree = $baseTree }
try {
  $tree = Invoke-RestMethod "$base/git/trees" -Headers $h -Method Post -Body ($treeBody | ConvertTo-Json -Depth 6) -ContentType 'application/json'
} catch {
  Write-Host "[ERROR] Tree creation failed: $($_.Exception.Message)"
  return
}

$commitBody = @{
  message = "sync: DeepSeek-V4.1-Flash + Codex comparison"
  tree = $tree.sha
}
if ($headSha) { $commitBody.parents = @($headSha) }
try {
  $commit = Invoke-RestMethod "$base/git/commits" -Headers $h -Method Post -Body ($commitBody | ConvertTo-Json -Depth 5) -ContentType 'application/json'
} catch {
  Write-Host "[ERROR] Commit creation failed: $($_.Exception.Message)"
  return
}

try {
  if ($headSha) {
    $refBody = @{ sha = $commit.sha; force = $false } | ConvertTo-Json
    Invoke-RestMethod "$base/git/refs/heads/main" -Headers $h -Method Patch -Body $refBody -ContentType 'application/json' | Out-Null
  } else {
    $refBody = @{ ref = 'refs/heads/main'; sha = $commit.sha } | ConvertTo-Json
    Invoke-RestMethod "$base/git/refs" -Headers $h -Method Post -Body $refBody -ContentType 'application/json' | Out-Null
  }
  Write-Host "[DONE] One commit pushed: https://github.com/$user/$repoName/commit/$($commit.sha)"
} catch {
  Write-Host "[ERROR] Updating main failed: $($_.Exception.Message)"
  return
}

Write-Host "[SECURITY] Revoke the token used for this upload when finished."
