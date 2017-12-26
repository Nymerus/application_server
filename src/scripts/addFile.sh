#!/bin/bash
fileVar="$1"
fileRights="$2"
filePath="$3"
fileCommit="$4"
echo "$4"
git read-tree $(git show-ref -s master) || git read-tree --empty
git update-index --add --cacheinfo $fileRights $(echo "$fileVar" | git hash-object -w --stdin) $filePath
if [ $(git show-ref -s master) ]; then git update-ref 'refs/heads/master' $(git commit-tree $(git write-tree) -p $(git show-ref -s master) -m '$fileCommit') $(git show-ref -s master);
else
	git update-ref 'refs/heads/master' $(git commit-tree $(git write-tree) -m '$fileCommit') $(git show-ref -s master);
fi;
