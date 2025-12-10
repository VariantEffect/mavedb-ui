import json
import os


# -- Project information -----------------------------------------------------

project = "MaveDB"
copyright = "2017-2025, MaveDB Developers"
author = "MaveDB Developers"

# The full version, including alpha/beta/rc tags
release = os.getenv("MAVEDB_VERSION")
if release is None:
    raise ValueError("$MAVEDB_VERSION not set")


# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    "sphinx.ext.autosectionlabel",
    "sphinx.ext.graphviz",
]

graphviz_output_format = "svg"
numfig = True

# Add any paths that contain templates here, relative to this directory.
templates_path = ["templates"]

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ["build", "images", "static", "Thumbs.db", ".DS_Store"]


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = "pyramid"

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ["static"]

# -- General substitutions and link targets ----------------------------------
rst_epilog = """
.. _MaveDB issue tracker: https://github.com/VariantEffect/mavedb-api/issues
.. _MaveDB GitHub: https://github.com/VariantEffect/mavedb-api
.. _MAVE-HGVS: https://www.mavedb.org/docs/mavehgvs
"""


def setup(app):
    app.add_css_file("styles.css")