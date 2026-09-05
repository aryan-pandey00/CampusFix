import Image from "next/image";

/**
 * The photo attached to a complaint, in a frame of a fixed shape.
 *
 * A phone camera shot is portrait, so letting the image size itself put a
 * 1066x1600 photo into an 871px column: 1307px tall, taller than the screen,
 * with the timeline shoved off the bottom. Worse, the reserved box came from
 * the width/height attributes (3:2) while the real one was 2:3, so everything
 * below the photo jumped 726px the moment it arrived.
 *
 * A frame whose shape comes from CSS fixes both: the box is identical before
 * and after loading, and every photo is the same size however it was held.
 * Contained, never cropped, because the fault can be at the edge of the shot
 * — and the frame is a link, since a letterboxed portrait ends up small.
 */
export function ComplaintPhoto({
  url,
  ticketNo,
}: {
  url: string;
  ticketNo: string;
}) {
  return (
    <figure className="mt-4 max-w-lg">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block aspect-[4/3] overflow-hidden rounded-[var(--radius)] border border-border bg-muted transition-colors hover:border-primary/40"
      >
        <Image
          src={url}
          alt={`Photo attached to ${ticketNo}`}
          /* Inert: the CSS below owns the box. They only satisfy next/image. */
          width={900}
          height={600}
          unoptimized
          className="h-full w-full object-contain"
        />
      </a>
      <figcaption className="mt-1.5 text-xs text-muted-foreground">
        Opens the full photo in a new tab.
      </figcaption>
    </figure>
  );
}
