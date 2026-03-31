import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../../components/Admin/AdminLayout';

// Sub-pages
import AuctionControl from './AuctionControl';
import PlayersManagement from './PlayersManagement';
import TeamsManagement from './TeamsManagement';
import QueueManagement from './QueueManagement';
import HistoryManagement from './HistoryManagement';
import SquadsOverview from '../Common/SquadsOverview';

export default function AdminDashboard() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AuctionControl />} />
        <Route path="players" element={<PlayersManagement />} />
        <Route path="teams" element={<TeamsManagement />} />
        <Route path="queue" element={<QueueManagement />} />
        <Route path="history" element={<HistoryManagement />} />
        <Route path="squads" element={<SquadsOverview />} />
      </Route>
    </Routes>
  );
}
