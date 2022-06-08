Copy-Item ".\commit-msg" -Destination "..\.git\hooks\"
ICACLS "..\.git\hooks\commit-msg" /grant:r "users:(RX)" /C