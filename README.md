
# tmpshare

Easily share temporary files over http

Like https://transfer.sh/ but with following differences:

- Shared files are deleted immediately once they are downloaded
- Files are encrypted on the server no encryption key is saved on the server

## Usage

Uploads can be done using a buildin form or curl:

    $ curl -T file.txt example.com
    http://example.com/download/2015-03-29-14-57-a25bd309c8/file.txt#6028503d10954b73ab57e326997bca0b67c5b061

    $ curl -F file=@file.txt -F file2=@file2.txt example.com
    http://example.com/download/2015-03-29-14-58-bd7dd3cfb3/file.txt#4806f599e6d104b2ab93c709db2c3769d576eb8d
    http://example.com/download/2015-03-29-14-58-e600a5b4fa/file2.txt#87fa049560d6b3f4b9fa77d1708dc6b399eb3d4c

