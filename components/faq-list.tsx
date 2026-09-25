import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { Faq } from "@/lib/faq"
import { cn } from "@/lib/utils"

/** FAQ accordion whose answers stay in the server-rendered HTML while
 * collapsed (`keepMounted` + `hiddenUntilFound`), so search engines can read
 * them, FAQPage markup matches visible content, and Ctrl+F finds them. */
export function FaqList({ faqs, className }: { faqs: Faq[]; className?: string }) {
  return (
    <Accordion className={cn("gap-3 rounded-2xl bg-muted/60 p-3 sm:p-4", className)}>
      {faqs.map((faq) => (
        <AccordionItem
          key={faq.question}
          value={faq.question}
          className="rounded-xl border border-border bg-card px-5"
        >
          <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
          <AccordionContent keepMounted hiddenUntilFound className="text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
