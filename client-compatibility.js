/**
 * ExpertHub Client Compatibility Layer
 * ------------------------------------
 * This module contains endpoints that are part of the public/js SPA contract
 * but are intentionally kept outside the main server file.
 *
 * It supports both:
 *   1. MySQL mode
 *   2. in-memory demo mode
 *
 * The module is deliberately small and additive: existing backend routes
 * remain authoritative.
 */

'use strict';

module.exports = function registerClientCompatibility(deps) {
  const {
    app,
    auth,
    poolOrThrow,
    demo,
    nextId,
    bcrypt,
    asyncH,
    safeRoute,
    logAudit,
    institutionAudit,
    notify,
  } = deps;

  const jsonError = (res, status, error, extra = {}) =>
    res.status(status).json({ ok: false, error, ...extra });

  /* ------------------------------------------------------------
     GET /api/institution/report-definitions/:id/run

     The SPA calls saved-report execution with GET. The original
     server already supports POST for the same operation, so this
     adapter exposes the GET form without changing the existing API.
     ------------------------------------------------------------ */
  app.get(
    '/api/institution/report-definitions/:id/run',
    auth(),
    asyncH(async (req, res) => {
      if (demo.active) {
        const definition = (demo.reportDefinitions || []).find(
          d => Number(d.id) === Number(req.params.id)
        );
        if (!definition) {
          return jsonError(res, 404, 'Report definition not found');
        }

        const sourceMap = {
          trainee: demo.trainees || [],
          programme: demo.programmes || [],
          cohort: demo.cohorts || [],
          certificate: demo.certificatesInst || [],
          budget: demo.budgetAllocations || [],
          instructor: demo.instructors || [],
        };

        const rows = sourceMap[definition.data_source] || [];
        return res.json({
          ok: true,
          definition,
          rows: rows.slice(0, 500),
          count: Math.min(rows.length, 500),
          generated_at: new Date().toISOString(),
          _demo: true,
        });
      }

      const pool = poolOrThrow();

      const [[institutionUser]] = await pool.query(
        'SELECT institution_id FROM users WHERE id=?',
        [req.user.id]
      );
      if (!institutionUser?.institution_id) {
        return jsonError(res, 403, 'Not an institution account');
      }

      const [[definition]] = await pool.query(
        'SELECT * FROM report_definitions WHERE id=? AND institution_id=?',
        [req.params.id, institutionUser.institution_id]
      );

      if (!definition) {
        return jsonError(res, 404, 'Report definition not found');
      }

      const tableMap = {
        trainee: 'users',
        programme: 'programmes',
        cohort: 'cohorts',
        certificate: 'institution_certificates',
        budget: 'budget_allocations',
        instructor: 'users',
      };

      const table = tableMap[definition.data_source] || 'users';

      /*
       * The columns are deliberately selected from the table rather
       * than interpolating user supplied SQL. table is selected only
       * from the fixed allow-list above.
       */
      const [rows] = await pool.query(
        `SELECT * FROM ${table} WHERE institution_id=? LIMIT 500`,
        [institutionUser.institution_id]
      );

      return res.json({
        ok: true,
        definition: {
          id: definition.id,
          name: definition.name,
          data_source: definition.data_source,
          columns: definition.columns || [],
        },
        rows,
        count: rows.length,
        generated_at: new Date().toISOString(),
      });
    }, { rows: [], count: 0 })
  );

  /* ------------------------------------------------------------
     POST /api/user/consultations

     Used by the learner consultation request modal. This is
     intentionally separate from /api/consultations/book because the
     SPA supports an initial "request" workflow without selecting a
     specific time slot.
     ------------------------------------------------------------ */
  app.post(
    '/api/user/consultations',
    auth(),
    asyncH(async (req, res) => {
      const body = req.body || {};
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();
      const consultationType = String(body.consultation_type || 'video');
      const priority = String(body.priority || 'normal');
      const expertId = body.expert_id ? Number(body.expert_id) : null;

      if (!title || !description) {
        return jsonError(res, 400, 'title and description are required');
      }

      if (!['video', 'audio', 'chat', 'phone', 'in_person'].includes(consultationType)) {
        return jsonError(res, 400, 'Invalid consultation type');
      }

      if (demo.active) {
        if (expertId) {
          const expert = demo.users.find(
            u => Number(u.id) === expertId &&
                 u.role === 'expert' &&
                 u.status === 'active'
          );

          if (!expert) {
            return jsonError(res, 404, 'Expert not found');
          }
        }

        const user =
          demo.users.find(u => Number(u.id) === Number(req.user.id)) ||
          null;

        const expert =
          expertId
            ? demo.users.find(u => Number(u.id) === expertId)
            : demo.users.find(u => u.role === 'expert' && u.status === 'active');

        const consultation = {
          id: nextId('consultations'),
          user_id: Number(req.user.id),
          expert_id: expert ? expert.id : null,
          client_name: user?.name || req.user.email || 'Learner',
          client_email: user?.email || req.user.email || '',
          expert_name: expert?.name || null,
          expert_email: expert?.email || null,
          expert_specialization: expert?.specialization || null,
          title,
          description,
          priority,
          status: expert ? 'pending_expert_confirmation' : 'pending_matching',
          consultation_type: consultationType,
          session_type: 'requested',
          price: expert ? Number(expert.hourly_rate || 0) : 0,
          duration_minutes: 30,
          payment_status: 'pending',
          scheduled_at: null,
          created_at: new Date(),
        };

        demo.consultations.push(consultation);

        if (expert) {
          demo.notifications.push({
            id: nextId('notifications'),
            user_id: expert.id,
            title: 'New consultation request',
            message: `${consultation.client_name} requested: ${title}`,
            type: 'booking',
            is_read: 0,
            created_at: new Date(),
          });
        }

        return res.status(201).json({
          ok: true,
          id: consultation.id,
          consultation,
          status: consultation.status,
          message: 'Consultation request created',
          _demo: true,
        });
      }

      const pool = poolOrThrow();

      if (expertId) {
        const [[expert]] = await pool.query(
          `SELECT id, name, email, specialization, hourly_rate
             FROM users
            WHERE id=? AND role='expert' AND status='active'`,
          [expertId]
        );

        if (!expert) {
          return jsonError(res, 404, 'Expert not found');
        }
      }

      const [[requester]] = await pool.query(
        `SELECT id, name, email
           FROM users
          WHERE id=?`,
        [req.user.id]
      );

      if (!requester) {
        return jsonError(res, 401, 'User account not found');
      }

      const [result] = await pool.query(
        `INSERT INTO consultations
          (user_id, expert_id, title, description, status,
           consultation_type, session_type, price, duration_minutes,
           payment_status, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, 30, 'pending', NULL)`,
        [
          requester.id,
          expertId || null,
          title,
          description,
          expertId ? 'pending_expert_confirmation' : 'pending_matching',
          consultationType,
          0,
        ]
      );

      if (expertId && typeof notify === 'function') {
        await notify(
          expertId,
          'New consultation request',
          `${requester.name || requester.email} requested: ${title}`,
          'booking'
        ).catch(() => {});
      }

      if (typeof logAudit === 'function') {
        await logAudit(
          req.user.id,
          'consultation.request',
          'consultation',
          result.insertId,
          { title, priority, expert_id: expertId },
          req.ip
        ).catch(() => {});
      }

      return res.status(201).json({
        ok: true,
        id: result.insertId,
        status: expertId ? 'pending_expert_confirmation' : 'pending_matching',
        message: 'Consultation request created',
      });
    })
  );

  /* ------------------------------------------------------------
     PUT /api/institution/programmes/modules/:moduleId

     The SPA's module editor uses the module id directly. Existing
     routes use /programmes/:programmeId/modules/:moduleId for delete
     and /programmes/:id/modules for create/list. This adapter fills
     the update form used by the browser.
     ------------------------------------------------------------ */
  app.put(
    '/api/institution/programmes/modules/:moduleId',
    auth(),
    asyncH(async (req, res) => {
      if (demo.active) {
        if (!Array.isArray(demo.programmeModules)) demo.programmeModules = [];
        const moduleRow = demo.programmeModules.find(
          m => Number(m.id) === Number(req.params.moduleId)
        );
        if (!moduleRow) return jsonError(res, 404, 'Programme module not found');

        for (const key of ['title', 'description', 'duration_hours', 'delivery_mode']) {
          if (req.body?.[key] !== undefined) moduleRow[key] = req.body[key];
        }
        moduleRow.updated_at = new Date();

        return res.json({ ok: true, id: moduleRow.id, module: moduleRow, _demo: true });
      }

      const pool = poolOrThrow();

      const [[institutionUser]] = await pool.query(
        'SELECT institution_id FROM users WHERE id=?',
        [req.user.id]
      );
      if (!institutionUser?.institution_id) {
        return jsonError(res, 403, 'Not an institution account');
      }
      const allowed = ['title', 'description', 'duration_hours', 'delivery_mode'];
      const sets = [];
      const values = [];

      for (const key of allowed) {
        if (req.body?.[key] !== undefined) {
          sets.push(`${key}=?`);
          values.push(req.body[key]);
        }
      }

      if (!sets.length) {
        return res.json({ ok: true, message: 'Nothing to update' });
      }

      values.push(req.params.moduleId, institutionUser.institution_id);

      const [result] = await pool.query(
        `UPDATE programme_modules pm
            JOIN programmes p ON p.id=pm.programme_id
            SET ${sets.join(', ')}
          WHERE pm.id=? AND p.institution_id=?`,
        values
      );

      if (!result.affectedRows) {
        return jsonError(res, 404, 'Programme module not found');
      }

      if (typeof institutionAudit === 'function') {
        await institutionAudit(
          req.institution.id,
          req.user.id,
          req.user.email,
          `Updated programme module #${req.params.moduleId}`,
          null,
          req.ip
        ).catch(() => {});
      }

      return res.json({
        ok: true,
        id: Number(req.params.moduleId),
        updated: result.affectedRows,
      });
    })
  );

  /* ------------------------------------------------------------
     SPA API discovery endpoint
     ------------------------------------------------------------ */
  app.get('/api/client/compatibility', (req, res) => {
    res.json({
      ok: true,
      service: 'ExpertHub Client Compatibility Layer',
      version: '1.0.0',
      frontend: {
        api_base: '/api',
        authentication: 'Bearer JWT',
        refresh_endpoint: '/api/auth/refresh',
        socket_path: '/socket.io',
      },
      adapters: [
        'GET /api/institution/report-definitions/:id/run',
        'POST /api/user/consultations',
        'PUT /api/institution/programmes/modules/:moduleId',
      ],
      demo_mode: !!demo.active,
      timestamp: new Date().toISOString(),
    });
  });
};
