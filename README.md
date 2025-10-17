Had to run below code to link bucket to queue, there was no way to define this in config or code:

```bash
npx wrangler r2 bucket notification create ankisub-production --event-type object-create --queue ankisub-production
```
