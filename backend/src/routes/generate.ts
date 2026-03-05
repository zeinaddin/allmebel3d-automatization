import { Router, Request, Response } from 'express';
import { FAL_API_KEY } from '../config';

const FAL_URL = 'https://fal.run/fal-ai/nano-banana-pro/edit';

export function createGenerateRouter(): Router {
  const router = Router();

  router.post('/generate-room', async (req: Request, res: Response) => {
    if (!FAL_API_KEY) {
      res.status(503).json({ error: 'AI generation not configured (FAL_API_KEY missing)' });
      return;
    }

    const { image } = req.body as { image?: string };

    if (!image) {
      res.status(400).json({ error: 'Missing "image" field (base64 data URI)' });
      return;
    }

    try {
      const response = await fetch(FAL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt:
            'Transform this 3D kitchen render into a photorealistic kitchen photograph. ' +
            'Keep the exact same layout, cabinet positions, appliances, and wall configuration. ' +
            'Add realistic materials, natural lighting, shadows, reflections, wood textures, ' +
            'marble countertops, and make it look like a professional interior design photo.',
          image_urls: [image],
          num_images: 1,
          aspect_ratio: 'auto',
          output_format: 'png',
          resolution: '2K',
          safety_tolerance: 6,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[generate-room] fal.ai error:', response.status, err);
        res.status(502).json({ error: 'fal.ai error', details: err });
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('[generate-room] Request failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
