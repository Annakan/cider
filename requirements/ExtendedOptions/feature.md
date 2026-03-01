Read this file, ask any questions you have, then produce a implementation plan in a file named plan.md in this directory

Currently, the card attribute option type only takes color as values
We need to introduce a new type "ExDropdown" and the companion type "ExtendedOption" that would allow to associate any value to a dropdown option (a text area box).
That way we could use that value in the `handlebar` template.

Look for all the points of change, including potentially the database schema, the import/ export / save / load functionality and the grid editor.



