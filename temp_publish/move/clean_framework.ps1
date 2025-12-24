$root = "local_framework"

# 1. Delete .spec.move files
Get-ChildItem -Path $root -Recurse -Filter "*.spec.move" | Remove-Item -Force

# 2. Process .move files
$files = Get-ChildItem -Path $root -Recurse -Filter "*.move"

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($null -eq $content) { continue }
    $original_content = $content
    
    # Remove ALL attributes (lines starting with #[ or whitespace followed by #[)
    # Be careful not to remove comments starting with # (Move uses //)
    # Move attributes: #[attr]
    
    # Regex to remove attribute lines
    $content = $content -replace "(?m)^\s*#\[.*\]\s*$", ""
    
    # Also handle attributes that might not be on their own line (less common but possible)
    $content = $content -replace "#\[.*\]", ""
    
    # Remove spec blocks
    $lines = $content -split "`r`n|`r|`n"
    $new_lines = @()
    $in_spec = $false
    $brace_count = 0
    
    foreach ($line in $lines) {
        $stripped = $line.Trim()
        
        # Skip empty lines that might have been created by attribute removal
        if ($stripped -eq "") {
            # Optionally keep empty lines or remove them. Keeping them preserves line numbers.
            $new_lines += $line
            continue
        }
        
        if (-not $in_spec) {
            # Check for spec block start
            if ($stripped -match "\bspec\s+.*\{" -or $stripped -match "\bspec\s*\{") {
                $in_spec = $true
                $brace_count += ($line.Length - $line.Replace("{", "").Length) - ($line.Length - $line.Replace("}", "").Length)
                
                if ($brace_count -le 0) {
                    $in_spec = $false
                    $brace_count = 0
                }
                continue # Skip start line
            }
            else {
                $new_lines += $line
            }
        }
        else {
            $brace_count += ($line.Length - $line.Replace("{", "").Length) - ($line.Length - $line.Replace("}", "").Length)
            if ($brace_count -le 0) {
                $in_spec = $false
                $brace_count = 0
            }
        }
    }
    
    $final_content = $new_lines -join "`r`n"
    
    if ($final_content -ne $original_content) {
        Write-Host "Modified $($file.FullName)"
        $final_content | Set-Content -Path $file.FullName -NoNewline
    }
}
