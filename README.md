# mavedb-ui

MaveDB user interface

## Build and deployment

### Prerequisites

#### For development

Your development environment will need to have the following software installed.

- Node.js, version 16 or later

  https://nodejs.org/en/download/

  In addition to the installer packages, Node.js is also available through many package managers, such as Homebrew for macOS.

  Node.js includes the package manager NPM.

#### For deployment

- AWS command-line interface (AWS CLI) ([https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html))

  If you are a macOS user, notice that in addition to the procedure suggested by AWS, you may also choose to install the AWS CLI via Homebrew: [https://formulae.brew.sh/formula/awscli](https://formulae.brew.sh/formula/awscli)

### Installing dependencies

In the project root directory, run

```
npm install
```

to install all project dependencies.

### Running locally in development

In development, this Vue.js application is served by the Vue Loader, which supports hot reload of updated components.

To start the application in the Vue Loader, run this command from the project root directory:

```
npm run serve
```

### Building for production

In production, the application is a static web application bundled using Webpack.

To build for production, run

```
npm run build
```

in the project root directory. The result is generated in the `dest` subdirectory, and the contents of `dest` can be deployed as static files on any web server.

### Deploying in production

#### Prerequisites

- Set up your AWS command-line interface (AWS CLI) credentials.

  Please see [https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) for instructions.

  You may also find it convenient to use named profiles if you use more than one AWS account: [https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)

#### Procedure

To deploy in production, simply push the contents of `dist` to the appropriate S3 bucket:

```
aws s3 sync ./dist s3://mavedb-ui
```
