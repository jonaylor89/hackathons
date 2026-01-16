git clone https://github.com/jonaylor89/AudioME-node.git

zip -r AudioME-node .

az webapp create --resource-group resourceGroup --plan servicePlan --name AudioME-node

az webapp config appsettings set --resource-group resourceGroup --name AudioME-node --settings WEBSITE_NODE_DEFAULT_VERSION=8.11.1

az webapp up -n AudioME-node



