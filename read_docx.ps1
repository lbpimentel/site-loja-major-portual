Copy-Item 'Major_Portugal_Historia.docx' 'Major_Portugal_Historia.zip' -Force
Expand-Archive -Path 'Major_Portugal_Historia.zip' -DestinationPath 'temp_docx' -Force
$xml = [xml](Get-Content 'temp_docx\word\document.xml')
$text = $xml.document.body.p | ForEach-Object {
    if ($_.r) {
        $($_.r | ForEach-Object { $_.t }) -join ""
    }
}
$text -join "`r`n" | Out-File 'historia.txt'
Remove-Item -Recurse -Force 'temp_docx'
Remove-Item -Force 'Major_Portugal_Historia.zip'
