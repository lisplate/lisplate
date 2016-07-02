# Contributing

## Building Lisplate locally

Clone and/or fork the repo
```
cd {your-projects-directory}
git clone https://github.com/HallM/Lisplate.git
cd lisplate
```
or if you forked the repo
```
cd {your-projects-directory}
git clone https://github.com/{your-name}/Lisplate.git
cd lisplate
```

Install all dependencies and devDependencies with npm
```
npm install
```

Run all lints and tests **note**: lints and tests do not exist yet.
```
npm test
```

## Building the parser

Lisplate uses pegjs to compile a peg specification of the parser.
Pegjs will be installed with the devDependencies and can be run with npm.
```
npm run build-parser
```

## Contributing to Dust

- Be sure to fork the repo to send in pull requests.

- Search issues to find one to work on or submit a new one if you found
  a bug or new feature you would like to see.

- If you plan to work on an issue, post a comment on the issue
  letting everyone know you've started progress.

- Create a branch to work on with your local fork.
  ```
  git checkout -b my-branch-name
  ```

- Test your changes (eslint, unit tests, make sure coverage percentage does not drop)
  **note**: lints and tests do not exist yet.
  ```
  npm test
  ```

- Create a pull request referencing the issue the PR is based on.
