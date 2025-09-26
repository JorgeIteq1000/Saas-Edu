-- RLS Policies for teams table
CREATE POLICY "Admin can view all teams" ON public.teams
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Managers can view their own team" ON public.teams
  FOR SELECT USING (
    id = public.get_user_team_id(auth.uid()) OR
    manager_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can manage all teams" ON public.teams
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin_geral');

-- RLS Policies for permissions table
CREATE POLICY "Admin can view all permissions" ON public.permissions
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Users can view their own permissions" ON public.permissions
  FOR SELECT USING (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can manage all permissions" ON public.permissions
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin_geral');