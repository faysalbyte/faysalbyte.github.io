<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en"><head><meta charset="UTF-8"/><title>XML Sitemap | MD Faysal Hossain</title>
    <meta name="robots" content="noindex"/>
    <style>body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:32px;background:#eef1f5;color:#263238}
    h1{margin:0 0 4px}table{border-collapse:collapse;width:100%;max-width:960px;background:#fff}
    th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #dde3ea}th{background:#263238;color:#fff}
    a{color:#3a49d6}</style></head>
    <body><h1>XML Sitemap</h1><p>Pages listed for search engines: <xsl:value-of select="count(sm:urlset/sm:url)"/></p>
    <table><tr><th>URL</th><th>Last modified</th><th>Priority</th></tr>
    <xsl:for-each select="sm:urlset/sm:url"><tr>
      <td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
      <td><xsl:value-of select="sm:lastmod"/></td><td><xsl:value-of select="sm:priority"/></td></tr></xsl:for-each>
    </table></body></html>
  </xsl:template>
</xsl:stylesheet>
