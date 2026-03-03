Read this file, ask any questions you have, then produce a implementation plan in a file named plan.md in this directory

# The situation
We have implemented s `struct` type that allow storing yaml data in a field.
You can read the implementation summary here [Implentation_summary.md](../01_ObjectType/Implentation_summary.md)

# The problem
Currently, the card attribute option type only takes color as values
We need to extend it to be able to support nore useful types:

- color as now
- string (a raw string)
- numeric
- struct as a string containing yaml (the exact same logic as the struct type with optional schema)
Later on we might add more types like gradient, boolean, date, etc.

Moreover, it is impossible to control the key of the options for now.


And we need to expose the data stored in the attribute conforming to this extended option to the handlebar template.

# Use cases

We would like to be able to define a attribute type that maps rarity names to colors
or rarity names to numbers that represents a cost for instance.

| key | Value |
|-----|-------|
| "c" | "888"   |
| "U" |"#0000FF"|
| "R  |"#FF0000"|

or 


| key | Value      |
|-----|------------|
| "c" | "common"   |
| "U" | "uncommon" |
| "R  | "rare"     |

key    => Value



Look for all the points of change, including potentially the database schema, the import/ export / save / load functionality and the grid editor.



