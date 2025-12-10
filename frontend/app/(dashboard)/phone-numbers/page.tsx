"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import api from "@/lib/api";
import { Phone, CheckCircle2, XCircle, Plus, PhoneCall, Trash2, ChevronDown, UserX, User } from "lucide-react";

interface PhoneNumber {
  _id: string;
  phoneNumber: string;
  label: string;
  provider: string;
  isActive: boolean;
  status: 'available' | 'owned';
  assignedAgentId?: string;
  sipConfig?: {
    server: string;
    port: number;
    protocol: string;
    codec: string;
    maxSessions: number;
  };
}

interface Agent {
  _id: string;
  name: string;
  isActive: boolean;
}

export default function PhonesPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [claimDialog, setClaimDialog] = useState<{ open: boolean; phone: PhoneNumber | null }>({
    open: false,
    phone: null,
  });
  const [releaseDialog, setReleaseDialog] = useState<{ open: boolean; phone: PhoneNumber | null }>({
    open: false,
    phone: null,
  });
  const [callDialog, setCallDialog] = useState<{ open: boolean; phone: PhoneNumber | null }>({
    open: false,
    phone: null,
  });
  const [callNumber, setCallNumber] = useState('');

  const loadPhoneNumbers = async () => {
    try {
      const res = await api.get('/phone/numbers');
      setPhoneNumbers(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Error loading phone numbers:', err);
      toast.error('Ошибка загрузки телефонных номеров');
    }
  };

  const loadAgents = async () => {
    try {
      const res = await api.get('/agents');
      setAgents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading agents:', err);
      toast.error('Ошибка загрузки агентов');
    }
  };

  useEffect(() => {
    Promise.all([loadPhoneNumbers(), loadAgents()])
      .finally(() => setLoading(false));
  }, []);

  const myNumbers = phoneNumbers.filter(p => p.status === 'owned');
  const availableNumbers = phoneNumbers.filter(p => p.status === 'available');

  const handleClaimNumber = async () => {
    if (!claimDialog.phone) return;

    try {
      await api.post(`/phone/numbers/${claimDialog.phone._id}/claim`);
      toast.success('Номер успешно добавлен');
      await loadPhoneNumbers();
      setClaimDialog({ open: false, phone: null });
    } catch (err: any) {
      console.error('Error claiming number:', err);
      toast.error(err.response?.data?.message || 'Ошибка при добавлении номера');
    }
  };

  const handleReleaseNumber = async () => {
    if (!releaseDialog.phone) return;

    try {
      await api.post(`/phone/numbers/${releaseDialog.phone._id}/release`);
      toast.success('Номер возвращен в доступные');
      await loadPhoneNumbers();
      setReleaseDialog({ open: false, phone: null });
    } catch (err: any) {
      console.error('Error releasing number:', err);
      toast.error(err.response?.data?.message || 'Ошибка при возврате номера');
    }
  };

  const handleAssignAgent = async (phoneId: string, agentId: string | null) => {
    const phone = phoneNumbers.find(p => p._id === phoneId);
    const hadAgent = phone && getAgentId(phone.assignedAgentId);

    setAssigning(phoneId);
    try {
      await api.patch(`/phone/numbers/${phoneId}/assign-agent`, {
        agentId: agentId || null,
      });

      // Показываем разные сообщения в зависимости от действия
      if (!agentId) {
        toast.success('Агент снят с номера');
      } else if (hadAgent) {
        toast.success('Агент заменен');
      } else {
        toast.success('Агент назначен');
      }

      await loadPhoneNumbers();
    } catch (err: any) {
      console.error('Error assigning agent:', err);
      toast.error(err.response?.data?.message || 'Ошибка назначения агента');
    } finally {
      setAssigning(null);
    }
  };

  const handleMakeCall = async () => {
    if (!callDialog.phone || !callNumber) return;

    const agentId = getAgentId(callDialog.phone.assignedAgentId);

    if (!agentId) {
      toast.error('Необходимо назначить агента на этот номер');
      return;
    }

    try {
      await api.post('/phone/outbound-call/sip-trunk', {
        agent_id: agentId,
        agent_phone_number_id: callDialog.phone._id,
        to_number: callNumber,
      });

      toast.success('Звонок инициирован');
      setCallDialog({ open: false, phone: null });
      setCallNumber('');
    } catch (err: any) {
      console.error('Error making call:', err);
      toast.error(err.response?.data?.message || 'Ошибка при совершении звонка');
    }
  };

  const getAgentId = (agentId?: string | { _id: string; name: string }): string | undefined => {
    if (!agentId) return undefined;
    if (typeof agentId === 'object' && '_id' in agentId) {
      return agentId._id;
    }
    return agentId;
  };

  const getAgentName = (agentId?: string | { _id: string; name: string }) => {
    if (!agentId) return null;

    // Если agentId это объект с populated данными, вернуть имя напрямую
    if (typeof agentId === 'object' && 'name' in agentId) {
      return agentId.name;
    }

    // Иначе искать агента по ID
    const agent = agents.find(a => a._id === agentId);
    return agent?.name || 'Неизвестный агент';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Телефонные номера</h1>
          <p className="text-muted-foreground">
            Управление телефонными номерами компании
          </p>
        </div>
      </div>

      <Tabs defaultValue="my" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my">Мои номера ({myNumbers.length})</TabsTrigger>
          <TabsTrigger value="available">Доступные номера ({availableNumbers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Мои номера
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </div>
              ) : myNumbers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  У вас пока нет номеров. Добавьте номер из доступных.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Номер</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Провайдер</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Назначенный агент</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myNumbers.map((phone) => (
                      <TableRow key={phone._id}>
                        <TableCell className="font-medium">
                          {phone.phoneNumber}
                        </TableCell>
                        <TableCell>{phone.label}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{phone.provider}</Badge>
                        </TableCell>
                        <TableCell>
                          {phone.isActive ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Активен
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Неактивен
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-[200px] justify-between cursor-pointer"
                                disabled={assigning === phone._id}
                              >
                                <div className="flex items-center gap-2">
                                  {phone.assignedAgentId ? (
                                    <>
                                      <User className="h-4 w-4" />
                                      <span>{getAgentName(phone.assignedAgentId)}</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Не назначен</span>
                                    </>
                                  )}
                                </div>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px]">
                              <DropdownMenuLabel>Выберите агента</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {phone.assignedAgentId && (
                                <DropdownMenuItem
                                  onClick={() => handleAssignAgent(phone._id, null)}
                                  className="text-red-600"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Снять агента
                                </DropdownMenuItem>
                              )}
                              {phone.assignedAgentId && agents.filter(a => a.isActive && a._id !== getAgentId(phone.assignedAgentId)).length > 0 && (
                                <DropdownMenuSeparator />
                              )}
                              {agents
                                .filter(a => a.isActive && a._id !== getAgentId(phone.assignedAgentId))
                                .map((agent) => (
                                  <DropdownMenuItem
                                    key={agent._id}
                                    onClick={() => handleAssignAgent(phone._id, agent._id)}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    {agent.name}
                                  </DropdownMenuItem>
                                ))}
                              {agents.filter(a => a.isActive && a._id !== getAgentId(phone.assignedAgentId)).length === 0 && !getAgentId(phone.assignedAgentId) && (
                                <DropdownMenuItem disabled>
                                  Нет доступных агентов
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCallDialog({ open: true, phone })}
                              disabled={!phone.assignedAgentId}
                            >
                              <PhoneCall className="h-4 w-4 mr-1" />
                              Позвонить
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setReleaseDialog({ open: true, phone })}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Удалить
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Доступные номера
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </div>
              ) : availableNumbers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет доступных номеров
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Номер</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Провайдер</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableNumbers.map((phone) => (
                      <TableRow key={phone._id}>
                        <TableCell className="font-medium">
                          {phone.phoneNumber}
                        </TableCell>
                        <TableCell>{phone.label}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{phone.provider}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            Доступен
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => setClaimDialog({ open: true, phone })}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Добавить
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Claim Dialog */}
      <Dialog open={claimDialog.open} onOpenChange={(open) => setClaimDialog({ open, phone: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить номер</DialogTitle>
            <DialogDescription>
              Вы действительно хотите взять номер{' '}
              <strong>{claimDialog.phone?.phoneNumber}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimDialog({ open: false, phone: null })}>
              Отмена
            </Button>
            <Button onClick={handleClaimNumber}>
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Dialog */}
      <Dialog open={releaseDialog.open} onOpenChange={(open) => setReleaseDialog({ open, phone: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Вернуть номер</DialogTitle>
            <DialogDescription>
              Вы действительно хотите вернуть номер{' '}
              <strong>{releaseDialog.phone?.phoneNumber}</strong> в доступные?
              {releaseDialog.phone?.assignedAgentId && (
                <span className="block mt-2 text-yellow-600">
                  Внимание: Агент будет автоматически снят с этого номера.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialog({ open: false, phone: null })}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleReleaseNumber}>
              Вернуть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Dialog */}
      <Dialog open={callDialog.open} onOpenChange={(open) => {
        if (!open) {
          setCallDialog({ open: false, phone: null });
          setCallNumber('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Исходящий звонок</DialogTitle>
            <DialogDescription>
              Звонок будет совершен с номера{' '}
              <strong>{callDialog.phone?.phoneNumber}</strong>
              {callDialog.phone?.assignedAgentId && (
                <>
                  {' '}агентом <strong>{getAgentName(callDialog.phone.assignedAgentId)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="callNumber" className="text-sm font-medium">
                Номер телефона
              </label>
              <Input
                id="callNumber"
                placeholder="+77771234567"
                value={callNumber}
                onChange={(e) => setCallNumber(e.target.value)}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Введите номер телефона в формате +7XXXXXXXXXX
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCallDialog({ open: false, phone: null });
                setCallNumber('');
              }}
            >
              Отмена
            </Button>
            <Button onClick={handleMakeCall} disabled={!callNumber.trim()}>
              <PhoneCall className="h-4 w-4 mr-2" />
              Позвонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
