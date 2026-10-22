import { Request, Response, NextFunction } from 'express';
import { EventService } from './event.service';
import { sendCreated, sendSuccess } from '../../common/response';
import { BadRequestError, UnauthorizedError } from '../../common/errors';
import { CreateEventInput } from './event.validator';

export class EventController {
  constructor(private readonly eventService: EventService) {}

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // SEC-02: ignore any client-supplied organizerId (stripped by Zod anyway).
      // Only ADMIN may impersonate another organizer via `?organizerId=`.
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication is required to create an event');
      }
      const { organizerId: _ignored, ...body } = req.body as Record<string, unknown>;
      const adminOverride = req.query.organizerId as string | undefined;
      const organizerId =
        req.user.role === 'ADMIN' && adminOverride ? adminOverride : req.user.id;
      const event = await this.eventService.createEvent({
        ...body,
        organizerId,
      } as CreateEventInput);
      return sendCreated(res, event, 'Event created successfully');
    } catch (error) {
      return next(error);
    }
  };

  getAllEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as any;
      const events = await this.eventService.getAllEvents(status);
      return sendSuccess(res, events);
    } catch (error) {
      return next(error);
    }
  };

  getEventBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const event = await this.eventService.getEventBySlug(slug);
      return sendSuccess(res, event);
    } catch (error) {
      return next(error);
    }
  };

  getEventById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const event = await this.eventService.getEventById(id);
      return sendSuccess(res, event);
    } catch (error) {
      return next(error);
    }
  };

  getOrganizerDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const data = await this.eventService.getOrganizerDashboard(userId, role);
      return sendSuccess(res, data, 'Organizer dashboard retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  getOrganizerAttendees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const eventId = req.query.eventId as string | undefined;
      const search = req.query.search as string | undefined;
      const attendees = await this.eventService.getOrganizerAttendees(userId, role, eventId, search);
      return sendSuccess(res, attendees, 'Organizer attendees retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  uploadPoster = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BadRequestError('Tidak ada file poster yang diunggah. Silakan pilih file gambar.');
      }

      const fileUrl = `/uploads/posters/${req.file.filename}`;

      return sendSuccess(
        res,
        {
          fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        'Poster berhasil diunggah'
      );
    } catch (error) {
      return next(error);
    }
  };
}

