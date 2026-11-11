"""Build transparent brand assets from the supplied public/logo.jpg."""
from PIL import Image, ImageDraw, ImageFilter

SRC = "scripts/brand/logo-source.jpg"
WHITE_CUT = 250
SOFT = 25


def to_alpha(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    out = []
    for r, g, b in im.getdata():
        m = min(r, g, b)
        if m >= WHITE_CUT:
            out.append((0, 0, 0, 0))
            continue
        a = min(1.0, (WHITE_CUT - m) / SOFT)

        def un(c: int) -> int:
            v = (c - (1.0 - a) * 255.0) / a
            return 0 if v < 0 else (255 if v > 255 else int(round(v)))

        out.append((un(r), un(g), un(b), int(round(a * 255))))
    res = Image.new("RGBA", im.size)
    res.putdata(out)
    return res


def clean_alpha(im: Image.Image) -> Image.Image:
    """Drop faint JPEG haze, then soften the edge by a fraction of a pixel."""
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 60 else 255).filter(ImageFilter.GaussianBlur(0.5))
    return Image.merge("RGBA", (r, g, b, a))


def main() -> None:
    art = clean_alpha(to_alpha(Image.open(SRC)))
    art = art.crop(art.getbbox())
    art = art.filter(ImageFilter.UnsharpMask(radius=1.1, percent=45, threshold=2))
    art.save("public/logo.png", optimize=True)
    w, h = art.size
    print("logo.png", art.size)

    # The emblem ends above the wordmark; find the last row of real artwork.
    alpha = art.split()[-1]
    cut = h
    for y in range(int(h * 0.3), int(h * 0.7)):
        if sum(1 for v in alpha.crop((0, y, w, y + 1)).getdata() if v > 100) < 3:
            cut = y
            break
    mark = art.crop((0, 0, w, cut))
    mb = mark.getbbox()
    pad = 8
    mark = mark.crop((max(0, mb[0] - pad), max(0, mb[1] - pad), min(w, mb[2] + pad), min(cut, mb[3] + pad)))
    mark.save("public/logo-mark.png", optimize=True)
    print("logo-mark.png", mark.size)

    # Inverted emblem for dark backgrounds: navy ink becomes white, gold is kept.
    light = mark.copy()
    light.putdata(
        [
            (255, 255, 255, a) if b > r + 18 and b > g + 10 else (r, g, b, a)
            for r, g, b, a in light.getdata()
        ]
    )
    light.save("public/logo-mark-light.png", optimize=True)

    icon = Image.new("RGB", (512, 512), (245, 246, 251))
    scale = 360 / mark.width
    m = mark.resize((360, int(mark.height * scale)), Image.LANCZOS)
    icon.paste(m, ((512 - m.width) // 2, (500 - m.height) // 2), m)
    ImageDraw.Draw(icon).rectangle([0, 500, 512, 512], fill=(232, 174, 12))
    icon.save("public/icon.png", optimize=True)

    og = Image.new("RGB", (1200, 630), (245, 246, 251))
    ImageDraw.Draw(og).rectangle([0, 0, 1200, 14], fill=(232, 174, 12))
    gh = 420
    lockup = art.resize((int(art.width * gh / art.height), gh), Image.LANCZOS)
    og.paste(lockup, ((1200 - lockup.width) // 2, (630 - lockup.height) // 2 + 8), lockup)
    og.save("public/og.png", optimize=True)
    print("icon.png + og.png written")


if __name__ == "__main__":
    main()
