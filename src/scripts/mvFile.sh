#!/bin/bash
filePath1="$1"
fileObject="$2"
fileRights="$3"
filePath2="$4"
fileCommit="$5"
git read-tree --empty || git read-tree $(git show-ref -s master)
git rm --cached $filePath1
git update-index --add --cacheinfo $fileRights $fileObject $filePath2
git update-ref 'refs/heads/master' $(git commit-tree $(git write-tree) -p $(git show-ref -s master) -m '$fileCommit') $(git show-ref -s master)