import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import album from '../data/wedding-album.json';

export const galleryGroups = [
  { id: 'garden', title: 'Một ngày nên thơ', ids: ['630', '352', '542', '381', '403', '410', '496', '520'], start: '381' },
  { id: 'green', title: 'Bình yên là', ids: ['776', '785', '798'], start: '776' },
  { id: 'red', title: 'Từ nay về sau', ids: ['941', '935', '929', '963'], start: '963' },
  { id: 'white', title: 'Một đời thương', ids: ['712', '665', '638', '640', '648', '660', '679', '681', '683', '702'], start: '638' },
];

const imports = import.meta.glob<{ default: ImageMetadata }>('../assets/wedding/edited/*.jpg', { eager: true });
export const photoSources = Object.fromEntries(Object.entries(imports).map(([path, image]) => [path.match(/DSC01(\d+)\.jpg$/)![1], image.default]));
const extraAlts: Record<string, string> = {
  '381': 'Ánh trong váy cưới trắng, mỉm cười giữa khu vườn',
  '403': 'Duy và Ánh đứng giữa vườn hoa trắng',
  '410': 'Duy và Ánh nhìn nhau giữa vườn hoa, khung ảnh ngang',
  '496': 'Duy nắm tay Ánh, cô dâu giơ cao bó hoa giữa vườn',
  '520': 'Duy cầm máy ảnh, cùng Ánh cười vui giữa vườn hoa',
  '963': 'Duy và Ánh nghiêng người vui đùa trước phông chữ hỷ đỏ',
  '712': 'Duy và Ánh giơ tay và bó hoa trắng, mỉm cười chào khách',
  '665': 'Duy và Ánh nắm tay nhau trên phông trắng',
  '638': 'Duy và Ánh đứng bên nhau, cô dâu cầm hoa trắng',
  '640': 'Duy và Ánh mỉm cười trong bộ vest đen và váy cưới trắng',
  '648': 'Duy và Ánh tựa trán bên nhau, cô dâu ôm hoa trắng',
  '660': 'Duy và Ánh nắm tay nhau, cùng nhìn về phía trước',
  '679': 'Ánh khoác tay Duy, hai bạn đứng bên nhau trên phông trắng',
  '681': 'Duy và Ánh khoác tay nhau, mỉm cười bên bó hoa trắng',
  '683': 'Duy và Ánh cười tươi, cô dâu khoác tay chú rể',
  '702': 'Chân dung Duy và Ánh khoác tay nhau, cô dâu cầm hoa trắng',
};

export async function buildGalleries() {
  const alts = { ...extraAlts, ...Object.fromEntries(album.photos.map(p => [p.id, p.alt])) };
  return Promise.all(galleryGroups.map(async group => ({
    ...group,
    photos: await Promise.all(group.ids.map(async id => {
      const source = photoSources[id];
      if (!source || !alts[id]) throw new Error(`Missing gallery source or description: ${id}`);
      const widths = [800, 1280, 1920, 2560].filter(w => w <= source.width);
      const variants = await Promise.all(widths.map(width => getImage({ src: source, width, format: 'webp', quality: 88 })));
      return { id, alt: alts[id], width: source.width, height: source.height,
        src: variants[1].src, full: variants.at(-1)!.src,
        srcset: variants.map((image, i) => `${image.src} ${widths[i]}w`).join(', '),
      };
    })),
  })));
}
