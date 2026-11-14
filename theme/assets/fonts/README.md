# Typefaces

The site is set in two typefaces, both free to use under the SIL Open Font
Licence (the licence texts are in this folder):

- **EB Garamond**, by Georg Duffner and Octavio Pardo, for the reading text.
- **Cormorant Garamond**, by Christian Thalmann (Catharsis Fonts), for the
  masthead and titles.

The files here were made from the complete fonts published at
<https://github.com/google/fonts> (`ofl/ebgaramond`, `ofl/cormorantgaramond`),
cut down to the Latin alphabet so they load quickly. Unlike the versions
most websites use, these keep the true small capitals, old-style numerals and
printers' flowers (☙ ❦ ❧) that the design relies on.

They were produced with `pyftsubset` from the `fonttools` Python package,
keeping these OpenType features: `kern mark mkmk liga rlig locl ccmp calt onum
lnum pnum tnum case`, plus `smcp c2sc` in the EB Garamond roman. Each font is
split into a `latin` file and a `latin-ext` file (accented letters used in
other European languages and in transliterated Sanskrit); a reader's browser
only downloads the second when a page needs it.
