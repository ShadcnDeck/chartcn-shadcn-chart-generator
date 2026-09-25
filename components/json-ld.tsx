/** Renders schema.org structured data. `<` is escaped so text inside the
 * data (titles, FAQ answers) can never close the script tag early. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}
