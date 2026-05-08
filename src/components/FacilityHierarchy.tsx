import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Plus, Edit2, Trash2, MapPin, Network, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Facility {
  facility_id: number;
  facility_name: string;
  facility_code: string;
  parent_facility_id: number | null;
  parent_name: string | null;
  facility_category: string;
  regional_group: string;
  status: string;
  children?: Facility[];
}

const FacilityHierarchy = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const fetchFacilities = async () => {
    try {
      const res = await axios.get('/api/enterprise/facilities/hierarchy', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Build tree
      const raw: Facility[] = res.data;
      const map = new Map<number, Facility>();
      raw.forEach(f => map.set(f.facility_id, { ...f, children: [] }));
      
      const tree: Facility[] = [];
      map.forEach(f => {
        if (f.parent_facility_id) {
           const parent = map.get(f.parent_facility_id);
           if (parent) parent.children!.push(f);
           else tree.push(f); // Parent not found, add to root
        } else {
           tree.push(f);
        }
      });
      
      setFacilities(tree);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch facilities', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const toggleNode = (id: number) => {
    const newExp = new Set(expandedNodes);
    if (newExp.has(id)) newExp.delete(id);
    else newExp.add(id);
    setExpandedNodes(newExp);
  };

  const renderTree = (nodes: Facility[], depth = 0) => {
    return (
      <div className="space-y-3" style={{ paddingLeft: depth === 0 ? 0 : '2rem' }}>
        {nodes.map(node => (
          <div key={node.facility_id}>
            <div 
              className={`flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer ${depth === 0 ? 'bg-slate-50 border-blue-100' : ''}`}
              onClick={() => toggleNode(node.facility_id)}
            >
              <div className="flex-shrink-0">
                 {node.children && node.children.length > 0 ? (
                    expandedNodes.has(node.facility_id) ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />
                 ) : <div className="w-5" />}
              </div>
              <div className={`p-2 rounded-xl ${depth === 0 ? 'bg-blue-600/10 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                 <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                 <h4 className={`font-bold ${depth === 0 ? 'text-slate-900 text-lg' : 'text-slate-800'}`}>{node.facility_name}</h4>
                 <div className="flex items-center gap-3 text-xs mt-1">
                    <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{node.facility_code}</span>
                    <span className="text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {node.regional_group || 'Global'}</span>
                    <span className={`font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-[9px] ${
                      node.facility_category === 'CORPORATE' ? 'bg-purple-100 text-purple-700' :
                      node.facility_category === 'HOSPITAL' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>{node.facility_category}</span>
                 </div>
              </div>
              <div className="flex gap-2">
                 {/* Only visual placeholders for edit/add actions as per instruction scope, or we'd wire them up */}
                 <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Facility">
                    <Edit2 className="w-4 h-4" />
                 </button>
                 <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Add Sub-Facility">
                    <Plus className="w-4 h-4" />
                 </button>
              </div>
            </div>
            
            <AnimatePresence>
               {expandedNodes.has(node.facility_id) && node.children && node.children.length > 0 && (
                 <motion.div
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden mt-3"
                 >
                   <div className="border-l-2 border-slate-100 ml-[1.6rem] absolute h-full z-[-1]" />
                   {renderTree(node.children, depth + 1)}
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Facility Hierarchy...</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-end mb-8">
         <div>
             <div className="flex items-center gap-3 mb-2">
                <Network className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Facility Network</h1>
             </div>
             <p className="text-xs font-black uppercase tracking-widest text-slate-500">Global Hierarchy & Organization Structure</p>
         </div>
         <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
             <Plus className="w-4 h-4" /> New Facility
         </button>
      </div>

      <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200">
         {facilities.length > 0 ? renderTree(facilities) : <div className="text-center p-8 text-slate-500">No Facilities Configured</div>}
      </div>
    </div>
  );
};

export default FacilityHierarchy;
