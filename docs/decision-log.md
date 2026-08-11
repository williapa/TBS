# Decision Log

> Historical record: the decisions below describe the retired AWS/Express architecture. The supported architecture is documented in `docs/architecture.md`; the superseding Supabase migration decision is recorded in `docs/features/supabase-realtime-migration.md`.

## How To Use This File

When important decisions relevant to the development game are made, it is helpful to make a record of the thought process or key points in this file.

## Decisions

- I have previous experience working with AWS and cloudformation templates and so AWS services are heavily featured in the architecture. This is not to say that they are guaranteed to be the optimal components, however I did attempt to choose the best products from their offering for the job. 
- Dynamodb was chosen to avoid wrestling with frequent DB updates related to game logic. This is not to say that SQL couldn't be used, however there are plenty of educational resources online that suggest that NoSQL is a good fit for a web game, and since the most frequent pattern for the web game is fetching a game record and its data, NoSQL certainly fits this pattern. 
- The server combines traditional Rest with websockets. Websockets are the ideal fit for broadcasting game moves to players and viewers, although I did consider using rest-long polling. In this case, it seemed that long polling might end up consuming more DB reads, and may also end up sending more data over the network. At the same time, for creating/getting users, creating and listing maps, and creating, getting, and listing games, REST was a logical fit. Trying to fit all these operations within websockets seemed like a bigger challenge, even though it might have made a more straightforward server. 
- Socket.io was chosen as a library because it comes with an implementation of "rooms" - rather than rolling my own, this seemed like an easy way to isolate games. 
