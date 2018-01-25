#!/bin/bash
filePath="$1"
fileCommit="$2"
git read-tree $(git show-ref -s master) || git read-tree --empty
git rm -fr --cached $filePath
git update-ref 'refs/heads/master' $(git commit-tree $(git write-tree) -p $(git show-ref -s master) -m '$fileCommit') $(git show-ref -s master)
