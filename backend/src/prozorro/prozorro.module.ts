import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProzorroTender } from './entities/prozorro-tender.entity';
import { ProzorroTenderDoc } from './entities/prozorro-tender-doc.entity';
import { ProzorroAiResult } from './entities/prozorro-ai-result.entity';
import { ProzorroWebResult } from './entities/prozorro-web-result.entity';
import { ProzorroBlacklist } from './entities/prozorro-blacklist.entity';
import { ProzorroService } from './prozorro.service';
import { ProzorroController } from './prozorro.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProzorroTender,
      ProzorroTenderDoc,
      ProzorroAiResult,
      ProzorroWebResult,
      ProzorroBlacklist,
    ]),
  ],
  controllers: [ProzorroController],
  providers: [ProzorroService],
})
export class ProzorroModule {}
