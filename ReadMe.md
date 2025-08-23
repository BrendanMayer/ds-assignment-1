## Commit Log

### - Commit 1
I set up a basic CDK TypeScript project. It builds and can synthesize an empty stack. Nothing is deployed yet.

### - Commit 2 
I added a DynamoDB table with a composite key: pk and sk. I wrote a small seed script that inserts a few test items with a numeric rating and long description text.

![alt text](images/tableitems.png)

### - Commit 3
I created the App API and added a GET route that returns all items for a given pk. This endpoint is public and helps verify the table and data.

![alt text](images/tableGETcli.png)
