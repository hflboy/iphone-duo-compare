# ============================================================
# iPhone Duo 对比实验室 · 一键上传 GitHub(API 方式,无需 git)
#
# 用法:cd D:\HFL\study\iphone-duo-compare 然后 .\upload-to-github.ps1
# 上传内容:根目录文件(README/PROMPT/index.html/package.json/本脚本)
#           + tools\ + docs\ + .github\ + models\ 下全部项目
# 重复运行安全(已存在文件按 sha 自动更新)
# Token 创建:GitHub → Settings → Developer settings → Fine-grained tokens
#   权限:Contents = Read and write;Administration = Read and write
#        Workflows = Read and write(上传 .github/workflows/ 时必需)
# ============================================================
$ErrorActionPreference = 'Continue'
$root = "D:\HFL\study\iphone-duo-compare"
$repoName = 'iphone-duo-compare'
$repoDesc = 'iPhone Duo 交互式 3D 拆解实验室 · 同一提示词多 AI 模型生成项目对比'

# ---------- 1) 收集凭据(不落盘) ----------
$user = Read-Host "GitHub 用户名"
$sec = Read-Host "Personal Access Token(不回显)" -AsSecureString
$token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$h = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json"; "X-GitHub-Api-Version" = "2022-11-28" }

# ---------- 2) 校验 Token ----------
try {
  $me = Invoke-RestMethod "https://api.github.com/user" -Headers $h
  Write-Host "✅ Token 有效,登录身份:$($me.login)"
} catch {
  Write-Host "❌ Token 无效或网络不通:$($_.Exception.Message)"; return
}

# ---------- 3) 仓库不存在则创建 ----------
try {
  Invoke-RestMethod "https://api.github.com/repos/$($me.login)/$repoName" -Headers $h | Out-Null
  Write-Host "ℹ️ 仓库已存在,将同步更新。"
} catch {
  # 公开仓库:免费账号也能开 GitHub Pages(私有仓库需要 Pro/Team)
  $b = @{ name = $repoName; description = $repoDesc; private = $false; auto_init = $false } | ConvertTo-Json
  try {
    Invoke-RestMethod "https://api.github.com/user/repos" -Headers $h -Method Post -Body $b -ContentType "application/json" | Out-Null
    Write-Host "✅ 仓库已创建:https://github.com/$($me.login)/$repoName"
  } catch {
    Write-Host "❌ 创建仓库失败(检查 Token 的 Administration 权限):$($_.Exception.Message)"; return
  }
}
$base = "https://api.github.com/repos/$($me.login)/$repoName"

# ---------- 4) 收集上传清单 ----------
$jobs = New-Object System.Collections.Generic.List[object]
$skip = '\\\.git\\|\\node_modules\\|\\js\\lib\\|\\package-lock\.json$'

# 4.1 根目录单文件
foreach ($f in @("README.md", "PROMPT.md", "index.html", "package.json", ".gitignore", "upload-to-github.ps1")) {
  $p = Join-Path $root $f
  if (Test-Path $p) { $jobs.Add(@{ local = $p; remote = $f }) }
}

# 4.2 目录(递归,保留相对路径)
foreach ($d in @("tools", "docs", ".github", "models")) {
  $dir = Join-Path $root $d
  if (-not (Test-Path $dir)) { continue }
  Get-ChildItem $dir -Recurse -File -Force |
    Where-Object { $_.FullName -notmatch $skip } |
    ForEach-Object {
      $rel = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
      $jobs.Add(@{ local = $_.FullName; remote = $rel })
    }
}
Write-Host "ℹ️ 共 $($jobs.Count) 个文件待同步。"

# ---------- 5) 逐文件上传(幂等) ----------
foreach ($j in $jobs) {
  $rel = $j.remote
  $sha = $null
  try { $sha = (Invoke-RestMethod "$base/contents/$rel" -Headers $h).sha } catch {}
  $pb = @{
    message = "sync: $rel"
    content = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($j.local))
    branch  = "main"
  }
  if ($sha) { $pb.sha = $sha }
  try {
    Invoke-RestMethod "$base/contents/$rel" -Headers $h -Method Put -Body ($pb | ConvertTo-Json) -ContentType "application/json" | Out-Null
    Write-Host "  ✓ $rel"
  } catch {
    Write-Host "  ✗ $rel :: $($_.Exception.Message)"
  }
}
Write-Host "🎉 同步完成:https://github.com/$($me.login)/$repoName"
Write-Host "⚠️ 别忘了:到 GitHub → Settings → Developer settings 撤销本次使用的 Token。"
