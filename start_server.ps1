# PowerShell HTTP Server for Health Data Visualization
# This avoids CORS issues when opening HTML files directly

$Port = 8000
$Path = Get-Location
$Url = "http://localhost:$Port"

Write-Host "🚀 Starting PowerShell HTTP Server..." -ForegroundColor Green
Write-Host "📁 Serving files from: $Path" -ForegroundColor Cyan
Write-Host "🌐 Open your browser to: $Url" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

# Try to open browser automatically
try {
    Start-Process $Url
} catch {
    Write-Host "Could not open browser automatically. Please open manually." -ForegroundColor Yellow
}

# Start HTTP server
$Http = [System.Net.HttpListener]::new()
$Http.Prefixes.Add($Url)
$Http.Start()

try {
    while ($Http.IsListening) {
        $Context = $Http.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response
        
        $LocalPath = $Request.Url.LocalPath
        if ($LocalPath -eq "/") { $LocalPath = "/index.html" }
        
        $FilePath = Join-Path $Path $LocalPath.TrimStart("/")
        
        if (Test-Path $FilePath) {
            $Content = Get-Content $FilePath -Raw -Encoding UTF8
            $Extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
            
            # Set content type
            switch ($Extension) {
                ".html" { $Response.ContentType = "text/html" }
                ".js" { $Response.ContentType = "text/javascript" }
                ".css" { $Response.ContentType = "text/css" }
                ".json" { $Response.ContentType = "application/json" }
                ".geojson" { $Response.ContentType = "application/json" }
                ".csv" { $Response.ContentType = "text/csv" }
                ".png" { $Response.ContentType = "image/png" }
                ".jpg" { $Response.ContentType = "image/jpeg" }
                ".jpeg" { $Response.ContentType = "image/jpeg" }
                default { $Response.ContentType = "application/octet-stream" }
            }
            
            # Add CORS headers
            $Response.Headers.Add("Access-Control-Allow-Origin", "*")
            $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
            
            $Buffer = [System.Text.Encoding]::UTF8.GetBytes($Content)
            $Response.ContentLength64 = $Buffer.Length
            $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
        } else {
            $Response.StatusCode = 404
            $NotFound = @"
<html>
<head><title>404 - File Not Found</title></head>
<body>
<h1>404 - File Not Found</h1>
<p>The file <code>$LocalPath</code> was not found.</p>
<p><a href="/">Go back to home</a></p>
</body>
</html>
"@
            $Buffer = [System.Text.Encoding]::UTF8.GetBytes($NotFound)
            $Response.ContentLength64 = $Buffer.Length
            $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
        }
        
        $Response.Close()
    }
} finally {
    $Http.Stop()
    Write-Host "`n🛑 Server stopped" -ForegroundColor Red
}
