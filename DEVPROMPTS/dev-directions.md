Frontend:
- Design language of the app is Apple-like - sophisticated and elegant.
- Use tailwind for styling
- The app will treat both mobile and desktop as first class citizens. UI should be 100% usable and delighftul on a phone and use the additional screen space available on a desktop well. The UI should have consistency between desktop and mobile UIs. Like between these diffent modes, layouts will obviously change, but things like button and text colors etc should not change.
- Whenever a long running call happens (typically call to LLM), it should be an asynch call as per our principles, but also, in the UI, there should be an immediate update, cleanly showing that the user input has been accepted and is being processed, once the async call is completed, the UI should update to show the results. Wherever possible, these results should stream instead of batch-update so the app feels more responsive.
- Nothing randomly appears or disappears. Everything flows in or out of something.

Backend:
- use uv (instead of pip or python venv) to manage python versions, virtual environments, dependencies etc.
- Activate virtual environment in the backend directory to find the right "python" command and all dependencies

General Development Practices:
- When implementing a functionality, lookup the internet for reputed and reliable sources on best practices and examples of the implementation, also look up documentation of the authoritative sources for the technologies about to be used.
- You have chrome-devtools tool available. Use it to test or verify functionality as needed.
- There will be no synchronous calls anywhere in the application. Everything will be asynchronous by design and fault tolerant.
- The app is a delecate dance between LLM calls and parsing the responses. Whenever we change the format of response we request from an LLM, make sure we cascade that change everywhere in the app.
- Follow the DRY principle as much as possible. Where possible, use common elements and heirarchies (inheritance) instead of creating duplicates
- Use scripts/start.sh and stop.sh to start and stop the app. There are more scripts in the scripts directory to diagnose and manage the app state.
- When there are errors, they must be clearly communicated to the user right to the backend. Wherever the error occurs, it should be cleanly caught, logged, transported, and shown to the user elegantly. This is an LLM-driven app, we fully expect to run into token-per-minute limits etc. So when that happens, the app should degrade gracefuly, not fall flat on its face.
